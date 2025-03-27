const express = require("express");
const router = express.Router();
const { fundProject } = require("../controllers/handleProjects");
router.route("/fund").post(fundProject);
module.exports = router;
