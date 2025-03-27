const express = require("express");
const router = express.Router();
const { refundAmount } = require("../controllers/handlerefund");
router.route("/:name").post(refundAmount);
module.exports = router;
