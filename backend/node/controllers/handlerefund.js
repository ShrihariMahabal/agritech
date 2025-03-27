const Project = require("../models/Project");
const Investor = require("../models/Investor");

const refundAmount = async (req, res) => {
  try {
    // Find the project
    const project = await Project.findOne({ name: req.params.name });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.raisedAmount === 0) {
      return res.status(400).json({ message: "No funds to refund" });
    }

    // Fetch all investors who invested in this project
    const investors = await Investor.find({ _id: { $in: project.investors } });

    // Process refunds
    for (let investor of investors) {
      let updatedInvestments = [];
      let refundAmount = 0;

      // Iterate through investments to find matching project
      for (let investment of investor.investments) {
        if (investment.project.toString() === project._id.toString()) {
          refundAmount += investment.amount;
        } else {
          updatedInvestments.push(investment);
        }
      }

      // Update investor's funds and remove project investment record
      await Investor.findByIdAndUpdate(investor._id, {
        $inc: { totFunds: refundAmount }, // Refund the amount
        investments: updatedInvestments, // Remove the project investment
      });
    }

    // Reset project funds and clear investors
    await Project.findByIdAndUpdate(project._id, {
      raisedAmount: 0,
      investors: [],
    });

    res.status(200).json({ message: "Refunds processed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { refundAmount };
