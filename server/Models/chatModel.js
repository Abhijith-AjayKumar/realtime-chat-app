import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
    {
        members: { type: Array, required: true }, 
        isGroup: { type: Boolean, default: false }, 
        groupName: { type: String, default: "" },
        groupAdmin: { type: String, default: null }, 
        subAdmins: { type: Array, default: [] } 
    },
    { timestamps: true }
);

export default mongoose.model("Chat", chatSchema);