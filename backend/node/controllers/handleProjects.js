const Project = require("../models/Project");
const Investor = require("../models/Investor");
const Founder = require("../models/Founder");
const fundProject = async (req, res) => {
  try {
    const { projName, fundAmt } = req.body;
    console.log("entered fundProject");
    // Find the project
    const project = await Project.findOne({ name: projName });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

   

    // Update project: Increase raisedAmount and add investor if not already in list
    project.raisedAmount += fundAmt;
    await project.save();

    // Update investor: Increase totFunds and log investment
    

    return res.status(200).json({
      message: "Funding successful",
      project,
      
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: err.message || "Internal Server Error" });
  }
};
module.exports = { fundProject };