const express = require("express");
const router = express.Router();
// router.route("/").post(createUser);
// router.route("/:email/:pwd").get(findUser);

const {
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
} = require("../controllers/handleLogin");

const {
  createUser,
  findUser,
  fetchAllUsers,
  findUserById
} = require("../controllers/login");

router.route("/project").post(createProject);
router.route("/project/:name").get(getProject);
router.route("/founder").post(createFounder);
router.route("/founder/:name").get(getFounder);
router.route("/investor").post(createInvestor);
router.route("/investor/:name").get(getInvestor);
router.route("/investor/:id").get(getInvestorById);
router.route("/meeting").post(createMeeting);
router.route("/allprojects").get(getAllProjects);
router.route("/analyze-bills").post(analyzeBills);
router.route("/createuser").post(createUser);
router.route("/fetchuser/:id").get(findUserById);
router.route("/finduser/:email").get(findUser);
router.route("/incrementinv").post(incrementInvestment)
router.route("/incrementtrips").post(incrementTrips)
router.route("/getinvested").get(getInvestedProjects);
router.route("/getsteps").get(getSteps);
router.route("/findallusers").get(fetchAllUsers);

router.route("/gettrips").get(getTrips);





module.exports = router;
