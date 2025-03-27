const express = require("express");
const router = express.Router();
const {
  giveColor,
  receiveMoistureData,
} = require("../controllers/handleSensor");
router.route("/moisture").post(receiveMoistureData);
router.route("/color").get(giveColor);
module.exports = router;
