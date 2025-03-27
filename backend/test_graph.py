from neo4j import GraphDatabase
import logging
import fitz  # PyMuPDF
import pandas as pd
import google.generativeai as genai
import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
import json

# from langchain_core.chains import LLMChain

# Neo4j connection details
URI = "neo4j+s://3d0b58b9.databases.neo4j.io"
AUTH = ("neo4j", "yzfQoAAlR6mX5XL9eaBqJl0oHk-Kuxt3usWSpFIGSyw")  # Replace with your actual password

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SchemeKnowledgeGraph:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        
        try:
            self.driver.verify_connectivity()
            logger.info("✅ Successfully connected to Neo4j!")
        except Exception as e:
            logger.error("❌ Connection failed: %s", e)

    def close(self):
        self.driver.close()

    def create_scheme_nodes(self, schemes):
        """
        Create or update scheme nodes in Neo4j.
        """
        with self.driver.session() as session:
            # Create unique constraint if supported
            session.run("""
                CREATE CONSTRAINT unique_scheme_name IF NOT EXISTS 
                FOR (s:Scheme) REQUIRE s.name IS UNIQUE
            """
            )

            for scheme in schemes:
                session.run(
                    """
                    MERGE (s:Scheme {name: $scheme_name})
                    SET s.benefits = $benefits,
                        s.eligibility = $eligibility,
                        s.application_process = $application_process,
                        s.created_at = datetime(),
                        s.last_updated = datetime()
                    """,
                    scheme_name=scheme.get('scheme_name', 'Unknown'),
                    benefits=scheme.get('benefits', ''),
                    eligibility=scheme.get('eligibility', ''),
                    application_process=scheme.get('application_process', '')
                )
            logger.info("✅ Schemes inserted/updated in Neo4j")

    def add_domain_relationships(self):
        """
        Add domain-based relationships to categorize schemes.
        """
        with self.driver.session() as session:
            session.run(
                """
                MATCH (s:Scheme)
                WITH s,
                     CASE 
                         WHEN s.name CONTAINS 'Education' THEN 'Education'
                         WHEN s.name CONTAINS 'Health' THEN 'Healthcare'
                         WHEN s.name CONTAINS 'Welfare' THEN 'Social Welfare'
                         WHEN s.benefits CONTAINS 'employment' THEN 'Employment'
                         ELSE 'Miscellaneous'
                     END AS domain
                MERGE (d:Domain {name: domain})
                MERGE (s)-[:BELONGS_TO]->(d)
                """
            )
            logger.info("✅ Domain relationships added")

    def get_relevant_schemes(self, age, location, gender):
        query = """
        MATCH (s:Scheme)-[:TARGETS_AGE]->(a:AgeGroup),
              (s)-[:TARGETS_GENDER]->(g:Gender),
              (s)-[:TARGETS_LOCATION]->(l:Location)
        WHERE (a.range = "18-60" OR a.range = "All") 
          AND (g.type = $gender OR g.type = "All")
          AND l.name = $location
        RETURN s.name AS Scheme, s.explanation AS Explanation
        """
        
        with self.driver.session() as session:
            result = session.run(query, location=location, gender=gender)
            return [record for record in result]

# Initialize the knowledge graph
kg = SchemeKnowledgeGraph(URI, "neo4j", "yzfQoAAlR6mX5XL9eaBqJl0oHk-Kuxt3usWSpFIGSyw")

# Example schemes data (replace with actual data)
schemes_data = [
    {"scheme_name": "Education Grant", "benefits": "Scholarship", "eligibility": "Students", "application_process": "Online"},
    {"scheme_name": "Healthcare Aid", "benefits": "Medical support", "eligibility": "Citizens", "application_process": "Offline"}
]



def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    return text.strip()

# **CONFIGURE GEMINI AI**
genai.configure(api_key="AIzaSyBnkIJAU5_CFldzCvPp4cgBDo167wR_l2c")

# **FUNCTION TO EXTRACT TEXT FROM PDF**
# **FUNCTION TO EXTRACT TEXT FROM PDF**
def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    return text.strip()

# **CALL GEMINI AI FOR STRUCTURED DATA**
def call_gemini(pdf_text):
    prompt = f"""
Convert the following text into a structured JSON array.  
**The response must contain only JSON. No extra text.**  
Each object should have:
- "scheme_name"
- "benefits"
- "eligibility"
- "application_process"

Example:
```json
[
  {{
    "scheme_name": "Example Scheme",
    "benefits": "List of benefits",
    "eligibility": "Eligibility criteria",
    "application_process": "Steps to apply"
  }}
]
"""
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(prompt)

    if not response or not response.text:
        print("❌ Error: Empty response from Gemini AI.")
        return None

    # Extract JSON using regex
    match = re.search(r"\[\s*\{.*?\}\s*\]", response.text, re.DOTALL)
    if match:
        json_text = match.group(0)
        try:
            structured_data = json.loads(json_text)
            return structured_data
        except json.JSONDecodeError:
            print("❌ Error: Extracted text is not valid JSON.")
            return None
    else:
        print("❌ Error: No JSON found in Gemini response.")
        print("🔍 Full Response:", response.text)
        return None


# **RUN THE PIPELINE**
pdf_path = "schemes.pdf"  # Change this to your PDF file path
print("🔄 Extracting text from PDF...")
pdf_text = extract_text_from_pdf(pdf_path)


if not pdf_text:
    print("❌ No text extracted. Check the PDF file.")
else:
    print("✅ PDF Text Extracted Successfully.")

    print("🔄 Calling Gemini AI for structured data...")
    structured_data = call_gemini(pdf_text)

    if structured_data:
        print("✅ Gemini AI Response Received.")
        try:
            kg.create_scheme_nodes(structured_data)
            kg.add_domain_relationships()
        except Exception as e:
            logger.error("Neo4j insertion error: %s", e)
        finally:
            kg.close()


# ✅ Define RAG Prompt Template for LangChain
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key="AIzaSyBnkIJAU5_CFldzCvPp4cgBDo167wR_l2c")
prompt_template = ChatPromptTemplate.from_template("""
You are an expert in government schemes. A farmer has asked about schemes they can benefit from. 
Given the following personal details, list the most relevant schemes with a brief explanation:

Farmer Details:
- Age: {age}
- Location: {location}
- Occupation: {occupation}

Here are the available schemes:
{schemes}

Provide a clear and helpful response.
""")



#RAG
def get_scheme_recommendations(age, location, gender):
    # 1️⃣ Fetch relevant schemes from Neo4j
    schemes = kg.get_relevant_schemes(age, location, gender)
    
    if not schemes:
        return "❌ No relevant schemes found."

    # 2️⃣ Process schemes and handle missing explanations
    processed_schemes = []
    for scheme in schemes:
        scheme_name = scheme.get("Scheme", "Unknown Scheme")
        explanation = scheme.get("Explanation")  # May be None
        
        if not explanation:  # If explanation is missing, generate it
            explanation = generate_explanation_with_gemini(scheme_name)

        processed_schemes.append({
            "scheme_name": scheme_name,
            "explanation": explanation
        })

    return json.dumps(processed_schemes, indent=2)


# ✅ Function to Generate Explanation using Gemini AI
def generate_explanation_with_gemini(scheme_name):
    prompt = f"""
    Provide a concise and informative explanation for the government scheme named "{scheme_name}". 
    Keep it under 100 words.
    """
    
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(prompt)

    return response.text.strip() if response and response.text else "Explanation not available."


# ✅ Example Usage
farmer_details = {
    "age": 20,
    "location": "Punjab",
    "gender": "Male"
}

print("🔄 Fetching scheme recommendations...")
response = get_scheme_recommendations(**farmer_details)
print("✅ Response:\n", response)