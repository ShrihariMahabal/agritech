const express = require("express");
const router = express.Router();
const {
  updateSteps,
  updateCarbonFootprint,
  getSteps,
  getCarbonFootprint,
} = require("../controllers/handleGreen");
router.route("/updateSteps").post(updateSteps);
router.route("/updateCarbonFootprint").post(updateCarbonFootprint);
router.route("/getSteps").get(getSteps);
router.route("/getCarbonFootprint").get(getCarbonFootprint);
module.exports = router;
