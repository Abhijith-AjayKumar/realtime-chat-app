import Moment from "../Models/momentModel.js";
import User from "../Models/userModel.js";

// Create a new status/moment
export const createMoment = async (req, res) => {
    const { userId, userName, userProfilePic, media, mediaType, text } = req.body;

    if (!userId || !media || !mediaType) {
        return res.status(400).json({ message: "userId, media, and mediaType are required." });
    }

    try {
        const moment = new Moment({
            userId,
            userName,
            userProfilePic,
            media,
            mediaType,
            text
        });

        const response = await moment.save();
        res.status(200).json(response);
    } catch (error) {
        console.log("Error creating moment:", error);
        res.status(500).json(error);
    }
};

// Retrieve moments from last 24 hours
export const getMoments = async (req, res) => {
    try {
        const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const moments = await Moment.find({ createdAt: { $gte: timeLimit } }).sort({ createdAt: -1 });

        // Resolve latest userName and profilePic dynamically from User collection
        const populatedMoments = await Promise.all(
            moments.map(async (moment) => {
                const user = await User.findById(moment.userId);
                return {
                    ...moment.toObject(),
                    userName: user ? user.name : moment.userName,
                    userProfilePic: user ? user.profilePic : moment.userProfilePic,
                    userUniqueId: user ? user.userId : ""
                };
            })
        );

        res.status(200).json(populatedMoments);
    } catch (error) {
        console.log("Error fetching moments:", error);
        res.status(500).json(error);
    }
};
