const User = require("../models/User");

const updateSteps = async (req, res) => {
  console.log("updateSteps controller called");
  // Corrected function name to be more descriptive - updateSteps (lowercase s) is conventional for function names
  try {
    const userId = "67c3cf1766f888d598955e90"; // Get userId from route parameters
    const stepsToAdd = parseInt(req.body.stepsToAdd); // Get stepsToAdd from request body, parse to integer
    const parsedStepsToAdd = isNaN(stepsToAdd) ? 1 : stepsToAdd; // Default to 1 if not a valid number

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.user_steps += parsedStepsToAdd; // Increment user steps
    await user.save(); // Save the updated user document

    res.status(200).json({
      message: "User steps updated successfully",
      user: {
        userId: user._id, // Optionally return relevant user data
        steps: user.user_steps,
        name: user.name, // Add more user details if needed
      },
    });
  } catch (error) {
    console.error("Error in updateSteps controller:", error); // More accurate log message -  "updateSteps controller"
    if (error.name === "CastError" && error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid User ID format" }); // Handle invalid ObjectId
    }
    res
      .status(500)
      .json({ message: "Failed to update user steps", error: error.message });
  }
};

const updateCarbonFootprint = async (req, res) => {
  console.log("updateCarbonFootprint controller called");
  try {
    const userId = "67c3cf1766f888d598955e90"; // Get userId from route parameters
    const { travel, electricity, gas } = req.body; // Extract carbon footprint components from request body

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Conditionally update carbon footprint fields if they are provided in the request body
    if (travel !== undefined) {
      user.carbonFootprint.travel = Number(travel); // Ensure it's a number
    }
    if (electricity !== undefined) {
      user.carbonFootprint.electricity = Number(electricity); // Ensure it's a number
    }
    if (gas !== undefined) {
      user.carbonFootprint.gas = Number(gas); // Ensure it's a number
    }

    await user.save(); // Save the updated user document

    res.status(200).json({
      message: "Carbon footprint updated successfully",
      user: {
        userId: user._id, // Optionally return relevant user data
        carbonFootprint: user.carbonFootprint, // Return the updated carbon footprint object
        name: user.name, // Add more user details if needed
      },
    });
  } catch (error) {
    console.error("Error in updateCarbonFootprint controller:", error);
    if (error.name === "CastError" && error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid User ID format" }); // Handle invalid ObjectId
    }
    res.status(500).json({
      message: "Failed to update carbon footprint",
      error: error.message,
    });
  }
};
const getSteps = async (req, res) => {
  console.log("getSteps controller called");
  try {
    const userId = "67c3cf1766f888d598955e90"; // Get userId from route parameters
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      steps: user.user_steps, // Return only the user_steps value
    });
  } catch (error) {
    console.error("Error in getSteps controller:", error);
    if (error.name === "CastError" && error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid User ID format" }); // Handle invalid ObjectId
    }
    res
      .status(500)
      .json({ message: "Failed to get user steps", error: error.message });
  }
};

const getCarbonFootprint = async (req, res) => {
  console.log("getCarbonFootprint controller called");
  try {
    const userId = "67c3cf1766f888d598955e90"; // Get userId from route parameters
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      carbonFootprint: user.carbonFootprint, // Return the entire carbon footprint object
    });
  } catch (error) {
    console.error("Error in getCarbonFootprint controller:", error);
    if (error.name === "CastError" && error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid User ID format" }); // Handle invalid ObjectId
    }
    res.status(500).json({
      message: "Failed to get user carbon footprint",
      error: error.message,
    });
  }
};

module.exports = {
  updateSteps,
  updateCarbonFootprint,
  getSteps,
  getCarbonFootprint,
}; // Export all controllers
