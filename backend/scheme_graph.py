from flask import Flask, request, jsonify
from neo4j import GraphDatabase
import logging
import json
import google.generativeai as genai

# Initialize Flask app
app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
genai.configure(api_key="AIzaSyBnkIJAU5_CFldzCvPp4cgBDo167wR_l2c")
# Neo4j connection details
URI = "neo4j+s://3d0b58b9.databases.neo4j.io"
AUTH = ("neo4j", "yzfQoAAlR6mX5XL9eaBqJl0oHk-Kuxt3usWSpFIGSyw")

# Initialize Neo4j driver
class SchemeKnowledgeGraph:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
    
    def close(self):
        self.driver.close()
    
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

# Initialize knowledge graph
kg = SchemeKnowledgeGraph(URI, "neo4j", "yzfQoAAlR6mX5XL9eaBqJl0oHk-Kuxt3usWSpFIGSyw")

def generate_explanation_with_gemini(scheme_name):
    prompt = f"""
    Provide a concise and informative explanation for the government scheme named "{scheme_name}". 
    Keep it under 100 words.
    """
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(prompt)
    return response.text.strip() if response and response.text else "Explanation not available."

@app.route("/get_schemes", methods=["GET"])
def get_schemes():
    age = request.args.get("age")
    location = request.args.get("location")
    gender = request.args.get("gender")
    
    if not age or not location or not gender:
        return jsonify({"error": "Missing required parameters"}), 400
    
    schemes = kg.get_relevant_schemes(age, location, gender)
    
    if not schemes:
        return jsonify({"message": "No relevant schemes found."}), 404
    
    processed_schemes = []
    for scheme in schemes:
        scheme_name = scheme.get("Scheme", "Unknown Scheme")
        explanation = scheme.get("Explanation")
        
        if not explanation:
            explanation = generate_explanation_with_gemini(scheme_name)
        
        processed_schemes.append({
            "scheme_name": scheme_name,
            "explanation": explanation
        })
    
    return jsonify(processed_schemes)

if __name__ == "__main__":
    app.run(debug=True)
