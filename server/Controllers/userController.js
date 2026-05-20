import User from "../Models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const createToken = (_id) => {
    return jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: "3d" });
};

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: "User with the given email already exists..." });
        if (!name || !email || !password) return res.status(400).json({ message: "All fields are required..." });

        const generatedUserId = "user_" + Math.random().toString(36).substring(2, 8).toLowerCase();

        user = new User({ name, email, password, userId: generatedUserId });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();

        const token = createToken(user._id);
        res.status(200).json({ _id: user._id, name, email, userId: user.userId, token, blockedUsers: user.blockedUsers });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error during registration." });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid email or password..." });

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) return res.status(400).json({ message: "Invalid email or password..." });

        const token = createToken(user._id);
        res.status(200).json({ _id: user._id, name: user.name, email, userId: user.userId, token, blockedUsers: user.blockedUsers });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error during login." });
    }
};

export const findUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password"); 
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch users." });
    }
};

export const searchByUserId = async (req, res) => {
    try {
        const { searchId } = req.params;
        const user = await User.findOne({ userId: searchId }).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Error searching for user" });
    }
};

// 5. Update Profile
export const updateProfile = async (req, res) => {
    try {
        const { _id, currentPassword, newName, newEmail, newPassword } = req.body;
        
        let user = await User.findById(_id);
        if (!user) return res.status(400).json({ message: "User not found" });

        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) return res.status(400).json({ message: "Incorrect current password" });

        if (newName) user.name = newName;
        if (newEmail) user.email = newEmail;
        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        // FIX: Auto-patch old accounts missing a userId so Mongoose allows the save
        if (!user.userId) {
            user.userId = "user_" + Math.random().toString(36).substring(2, 8).toLowerCase();
        }

        await user.save();
        const token = createToken(user._id);
        res.status(200).json({ _id: user._id, name: user.name, email: user.email, userId: user.userId, token, blockedUsers: user.blockedUsers });
    } catch (error) {
        console.log("Profile Update Error:", error);
        res.status(500).json({ message: "Error updating profile" });
    }
};

// 6. Toggle Block User
export const toggleBlockUser = async (req, res) => {
    try {
        const { currentUserId, targetUserId } = req.body;
        let user = await User.findById(currentUserId);
        
        if (!user) return res.status(400).json({ message: "User not found" });

        if (!user.blockedUsers) user.blockedUsers = [];

        // FIX: Auto-patch old accounts missing a userId so Mongoose allows the save
        if (!user.userId) {
            user.userId = "user_" + Math.random().toString(36).substring(2, 8).toLowerCase();
        }

        if (user.blockedUsers.includes(targetUserId)) {
            user.blockedUsers = user.blockedUsers.filter(id => id !== targetUserId);
        } else {
            user.blockedUsers.push(targetUserId);
        }
        
        await user.save();
        res.status(200).json(user.blockedUsers);
    } catch (error) {
        console.log("Block Error:", error);
        res.status(500).json({ message: "Error toggling block status" });
    }
};

// 7. Unblock Multiple Users
export const unblockMultipleUsers = async (req, res) => {
    try {
        const { currentUserId, targetUserIds } = req.body;
        let user = await User.findById(currentUserId);
        
        if (!user) return res.status(400).json({ message: "User not found" });

        if (!user.blockedUsers) user.blockedUsers = [];

        // FIX: Auto-patch old accounts missing a userId so Mongoose allows the save
        if (!user.userId) {
            user.userId = "user_" + Math.random().toString(36).substring(2, 8).toLowerCase();
        }

        user.blockedUsers = user.blockedUsers.filter(id => !targetUserIds.includes(id));
        
        await user.save();
        res.status(200).json(user.blockedUsers);
    } catch (error) {
        console.log("Unblock Error:", error);
        res.status(500).json({ message: "Error unblocking users" });
    }
};

export const updateSearchId = async (req, res) => {
    const { _id, newSearchId } = req.body;

    try {
        // 1. Basic validation
        if (!newSearchId || newSearchId.length < 3) {
            return res.status(400).json({ message: "Search ID must be at least 3 characters long." });
        }

        // Prevent spaces and special characters
        const isValidId = /^[a-zA-Z0-9_.-]+$/.test(newSearchId);
        if (!isValidId) {
            return res.status(400).json({ message: "ID can only contain letters, numbers, underscores, and periods." });
        }

        // 2. Check if the ID is already taken by someone ELSE
        // 🔥 CHANGED userModel to User
        const existingUser = await User.findOne({ userId: newSearchId });
        if (existingUser && existingUser._id.toString() !== _id) {
            return res.status(400).json({ message: "This Search ID is already taken. Please try another one." });
        }

        // 3. Update the user
        // 🔥 CHANGED userModel to User
        const updatedUser = await User.findByIdAndUpdate(
            _id,
            { userId: newSearchId },
            { new: true } 
        );

        res.status(200).json(updatedUser);
    } catch (error) {
        console.log("CRASH IN UPDATE ID:", error); 
        res.status(500).json({ message: "Server error while updating ID." });
    }
};