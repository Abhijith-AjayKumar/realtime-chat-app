import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, minlength: 3, maxlength: 30 },
        email: { type: String, required: true, minlength: 3, maxlength: 200, unique: true },
        password: { type: String, required: true, minlength: 3, maxlength: 1024 },
        userId: { type: String, required: true, unique: true }, 
        blockedUsers: { type: Array, default: [] },
        profilePic: { type: String, default: "" } 
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);