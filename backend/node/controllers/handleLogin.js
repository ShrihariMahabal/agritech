const Project = require("../models/Project");
const Investor = require("../models/Investor");
const Founder = require("../models/Founder");
const Meeting = require("../models/Meeting");
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/User'); // ADD THIS LINE: Import the User model

// Initialize Gemini API
const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });



const createProject = async (req, res) => {
  try {
    const founder = await Founder.findOne({ name: req.body.founderName });

    if (!founder) {
      return res.status(404).json({ error: "Founder not found" });
    }

    console.log("Founder before project creation:", founder);

    // Default initial progress phase
    const initialProgress = [
      {
        phaseName: "Research & Feasibility",
        tasks: [
          { title: "Assess Water Flow & Potential Sites", status: "completed" },
          { title: "Conduct Environmental Impact Study", status: "completed" },
          { title: "Obtain Government Approvals", status: "in-progress" },
          { title: "Analyze Economic Viability", status: "pending" },
        ],
        reportUri: "https://drive.google.com/file/d/1ABCxyz123/view?usp=sharing",
        meetUri: "https://drive.google.com/file/d/1SV-idaAp-sTlxsaURkO2VtAij3b8Hjib/view?usp=sharing",
        meetLikes: 19,
        meetDislikes: 8,
        satisfaction: 60,
      },
    ];

    // Extract optional fields with default values if not provided
    const {
      shortDescription = "",
      description = "",
      industry = "",
      imageUri = "",
      fundingGoal,
      raisedAmount = 0,
      investors = [],
      sustainability_score = 0,
      trustScore = 0,
      progress = initialProgress, // Default to initial progress phase
    } = req.body;

    // Create the project
    const project = new Project({
      name: req.body.name,
      shortDescription,
      description,
      industry,
      imageUri,
      fundingGoal,
      raisedAmount,
      founder: founder._id,
      investors,
      sustainability_score,
      trustScore,
      progress,
    });

    await project.save(); // Save project explicitly

    // Push new project ID to the founder's `projects` array and save
    founder.projects.push(project._id);
    await founder.save();

    console.log("Founder after project update:", await Founder.findById(founder._id));

    return res.status(201).json({ project, message: "Project created and added to founder" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};



const getProject = async (req, res) => {
  try {
    const project = await Project.findOne({ name: req.params.name });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    return res.status(200).json({ project });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ err });
  }
};

const createFounder = async (req, res) => {
  try {
    const founder = await Founder.create(req.body);
    return res.status(201).json({ founder });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ err: err.message || "Internal Server Error" });
  }
};

const getFounder = async (req, res) => {
  try {
    const founder = await Founder.findOne({ name: req.params.name });


    if (!founder) {
      return res.status(404).json({ message: "Founder not found" });
    }

    // Fetch full project details
    const projects = await Project.find({ _id: { $in: founder.projects } }).select("-__v -updatedAt");

    // Fetch full meeting details
    const meetings = await Meeting.find({ _id: { $in: founder.meetings } }).select("-__v -updatedAt");

    // Convert founder document to plain object and replace projects & meetings array
    const founderData = founder.toObject();
    founderData.projects = projects;
    founderData.meetings = meetings;

    return res.status(200).json({ founder: founderData });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};

const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().select("-__v -updatedAt");
    return res.status(200).json({ projects });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ err: err.message || "Internal Server Error" });
  }
};

const createInvestor = async (req, res) => {
  try {
    const investor = await Investor.create(req.body);
    return res.status(201).json({ investor });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ err: err.message || "Internal Server Error" });
  }
};

const getInvestor = async (req, res) => {
  try {
    const investor = await Investor.findOne({ name: req.params.name });
    if (!investor) {
      return res.status(404).json({ message: "Investor not found" });
    }
    return res.status(200).json({ investor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ err });
  }
};

const getInvestorById = async (req, res) => {
  try {
    const investor = await Investor.findById(req.params.id);
    if (!investor) {
      return res.status(404).json({ message: "Investor not found" });
    }
    return res.status(200).json({ investor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};

const incrementInvestment = async (req, res) => {
  try {
    const userId = "67c3cf1766f888d598955e90"; // Hardcoded user ID

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { invested: 1 } }, // Always increments by 1
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "Investment incremented", user: updatedUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};

const incrementTrips = async (req, res) => {
  try {
    const userId = "67c3cf1766f888d598955e90"; // Hardcoded user ID

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { public_trips: 1 } }, // Always increments by 1
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "Investment incremented", user: updatedUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};

const getInvestedProjects = async (req, res) => {
  try {
    const userId = "67c3cf1766f888d598955e90"; // Hardcoded user ID

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log(user)
    return res.status(200).json({ investedProjectsCount: user.invested });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};

const getSteps = async (req, res) => {
  try {
    const userId = "67c3cf1766f888d598955e90"; // Hardcoded user ID

    // Fetch the user from the database
    const user = await User.findById(userId);

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the number of steps
    return res.status(200).json({ stepsCount: user.user_steps });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};

const getTrips = async (req, res) => {
  try {
    const userId = "67c3cf1766f888d598955e90"; // Hardcoded user ID

    // Fetch the user from the database
    const user = await User.findById(userId);

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the number of steps
    return res.status(200).json({ public_trips : user.public_trips });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};
const createMeeting = async (req, res) => {
  try {
    const { founderName, investorNames, title, date, startTime, endTime, keyPoints } = req.body;

    // Find the founder
    const founder = await Founder.findOne({ name: founderName });
    if (!founder) {
      return res.status(404).json({ error: "Founder not found" });
    }

    // Find the investors
    const investors = await Investor.find({ name: { $in: investorNames } });
    if (investors.length !== investorNames.length) {
      return res.status(404).json({ error: "One or more investors not found" });
    }

    console.log("Founder before meeting creation:", founder);

    // Create the meeting
    const meeting = new Meeting({
      title,
      date,
      startTime,
      endTime,
      keyPoints,
      founder: founder._id,
      investors: investors.map((inv) => inv._id),
      sentiment: "Neutral" ,// Default value
      summary: "", // Default value
      transcripts: "", // Default value
    });

    await meeting.save(); // Save the meeting explicitly

    // Push the meeting ID to the founder's `meetings` array and save
    if (!founder.meetings) {
      founder.meetings = [];
    }
    founder.meetings.push(meeting._id);
    await founder.save();

    console.log("Founder after meeting update:", await Founder.findById(founder._id));

    return res.status(201).json({ meeting, message: "Meeting created successfully and linked to founder" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};


const analyzeBills = async (req, res) => {
  try {
    const { imagesBase64, userData } = req.body;

    // Validate input
    if (!imagesBase64 || !Array.isArray(imagesBase64) || imagesBase64.length !== 2) {
      return res.status(400).json({ error: 'Exactly 2 images are required' });
    }

    if (!userData || !userData.family_size || !userData.region) {
      return res.status(400).json({ error: 'Family size and region are required' });
    }

    // Initialize Gemini API
    const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });

    // Construct the updated prompt for precise carbon_emissions calculation
    const prompt = `
      Analyze this utility bill image for a household in India with ${userData.family_size} members in ${userData.region} and calculate the **precise carbon emissions** associated with the reported consumption, using specific emission factors.

      Return ONLY a valid JSON object for each bill, strictly following this format:
      \`\`\`json
      {
        "bill_type": "electricity|water|gas",
        "bill_provider": "string",
        "billing_period": "string",
        "consumption": {
          "value": number,
          "unit": "string",
          "previous_value": number or null
        },
        "amount": {
          "value": number,
          "currency": "string"
        },
        "consumption_rating": "excellent|good|average|high|excessive",
        "consumption_per_person": number,
        "regional_average_per_person": number,
        "percentage_diff_from_average": number,
        "seasonal_factor": number between 0.8 and 1.2,
        "sustainability_score": number between 0 and 100,
        "key_insights": [
          "string", "string"
        ],
        "recommendations": [
          "string", "string"
        ],
        "estimated_savings_potential": {
          "value": number,
          "unit": "string"
        },
        "carbon_emissions": {
          "value": number,
          "unit": "kgs"
        }
      }
      \`\`\`

      **Instructions for EXACT 'carbon_emissions' calculation:**

      - **MANDATORY:** You **MUST** calculate and return the 'carbon_emissions' value in kilograms (kgs) for each applicable bill type (electricity and gas). For water bills, return 0.
      - Perform an **EXACT calculation** of carbon emissions using the consumption from the bill and the following specific emission factors.

      - **Electricity Bills:**
        1.  **Emission Factor:** Use a carbon intensity of **0.82 kilograms of CO2 per kWh** for electricity in India (based on the average for 2023).
        2.  **Carbon Emissions Calculation:** 'carbon_emissions' = (Electricity consumption in kWh from the bill) * **0.82 kg CO2/kWh**. Use the consumption value directly from the bill to get the precise emission.

      - **Gas Bills (LPG assumed):**
        1.  **Emission Factor:** Use a CO2 emission factor of **2.9 kilograms of CO2 per kg of LPG**.
        2.  **Carbon Emissions Calculation:** 'carbon_emissions' = (Gas consumption in kg of LPG from the bill) * **2.9 kg CO2/kg LPG**. Use the gas consumption value directly from the bill to get the precise emission. If gas consumption unit is not in kg, mention the unit assumed for calculation in 'key_insights'. If gas consumption is not available on the bill, return 0 for carbon_emissions.

      - **Water Bills:** Return 'carbon_emissions': { "value": 0, "unit": "kgs" }.

      **Important Notes:**
      - Use the specified, precise emission factors for carbon emission calculations.
      - Ensure 'carbon_emissions' values for Electricity and Gas are based on the reported bill consumption and are calculated exactly as instructed.
      - Provide units clearly for all values in the JSON.
      - Do not include any additional text or explanations outside the JSON object.
      - The 'carbon_emissions' values should be specific and reflect the carbon footprint based on the provided emission factors for 2023 (for electricity) and the LPG emission factor. They should not be estimations or rounded values unless necessary due to limitations in input data.
    `;

    // Function to extract JSON from the response (no change needed)
    const extractJSON = (text) => {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return jsonMatch[0];
      }
      throw new Error('No JSON found in the response');
    };

    // Analyze both bills (no change needed for this part)
    const analysisResults = await Promise.all(
      imagesBase64.map(async (imageBase64) => {
        // Prepare the image for Gemini API
        const image = {
          inlineData: {
            data: imageBase64,
            mimeType: 'image/jpeg',
          },
        };

        // Generate content
        const result = await model.generateContent([prompt, image]);
        const response = await result.response;
        const text = response.text();

        // Log the raw response for debugging (optional, but good to keep for now)
        console.log('Raw Gemini Response:', text);

        // Parse the JSON response
        try {
          const jsonText = extractJSON(text);
          return JSON.parse(jsonText);
        } catch (error) {
          console.error('Failed to parse JSON:', text);
          throw new Error('Failed to parse Gemini response as JSON');
        }
      })
    );

    try {
      const user = await User.findById("67c3cf1766f888d598955e90");
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let updatedCarbonFootprint = { ...user.carbonFootprint };

      analysisResults.forEach(result => {
        if (result.bill_type === 'electricity' && result.carbon_emissions && result.carbon_emissions.value) {
          updatedCarbonFootprint.electricity += result.carbon_emissions.value;
        } else if (result.bill_type === 'gas' && result.carbon_emissions && result.carbon_emissions.value) {
          updatedCarbonFootprint.gas += result.carbon_emissions.value;
        }
      });

      user.analysisResults.push(...analysisResults);
      user.carbonFootprint = updatedCarbonFootprint;
      await user.save();
      console.log('User document updated successfully with precise carbon footprint emissions'); // Updated log message
    } catch (error) {
      console.error('Error saving user document:', error);
      return res.status(500).json({ error: 'Failed to save analysis results and update carbon footprint', details: error.message });
    } finally {
      console.log('completed');
    }

    // Return the results as an array of objects (no change needed)
    res.json(analysisResults);
  } catch (error) {
    console.error('Error analyzing bills:', error);
    res.status(500).json({ error: 'Failed to analyze bills', details: error.message });
  }
};

module.exports = {
  createProject,
  getProject,
  createFounder,
  getFounder,
  createInvestor,
  getInvestor,
  createMeeting,
  getAllProjects,
  getInvestorById,
  analyzeBills,
  incrementInvestment,
  getInvestedProjects,
  getSteps,
  getTrips,
  incrementTrips
};