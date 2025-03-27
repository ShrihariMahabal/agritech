const User = require("../models/User");

const createUser = async (req, res) => {
  try {
    const exists = await User.findOne({ email: req.body.email });
    if (exists) {
      return res
        .status(409)
        .json({ message: "User is already present", exists });
    } else {
      const user = await User.create(req.body);
      return res.status(201).json({ user });
    }
  } catch (err) {
    console.error(err);
    // Handle the error and send an appropriate response
    return res
      .status(500)
      .json({ err: err.message || "Internal Server Error" });
  }
};

const findUser = async (req, res) => {
  try {
    const { email, pwd: password } = req.params;
    // const { password } = req.body;
    // console.log("why am i here");
    console.log(password);
    // console.log(req.body);
    const user = await User.findOne({ email: email });
    if (!user)
      return res.status(400).json({ fetch: "User not found please Sign Up" });
    if (user.password === password) {
      // console.log(user._id);
      return res.status(201).json({ fetch: "successful", user });
    } // return res.status(201).json({ fetch: "successful", user });
    else
      return res
        .status(400)
        .json({ fetch: "Login unsuccessful, please enter correct password" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ err });
  }
};

const findUserById = async (req, res) => {
  try {
    const userId = req.params.id; // Extract user ID from request parameters

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" }); // Validate if ID is provided
    }

    // Find a single user by their ID in the database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" }); // Handle case where user is not found
    }

    // Exclude sensitive information like password
    const { password, ...userWithoutPassword } = user.toObject();

    // Return the user
    return res.status(200).json({ user: userWithoutPassword });

  } catch (err) {
    console.error("Error fetching user by ID:", err);
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid User ID format" }); // Handle invalid ObjectId format
    }
    return res.status(500).json({ error: "Failed to fetch user" }); // General error handling
  }
};

const fetchAllUsers = async (req, res) => {
  try {
    // Fetch all users from the database
    const users = await User.find({});

    // Optionally, you can exclude sensitive information like passwords
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user.toObject();
      return userWithoutPassword;
    });

    // Return the list of users
    return res.status(200).json({ users: usersWithoutPasswords });
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
};




module.exports = { createUser, findUser, fetchAllUsers, findUserById };
