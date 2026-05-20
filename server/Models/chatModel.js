import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
    {
        members: Array,
        isGroup: { type: Boolean, default: false },
        groupName: String,
        groupAdmin: String,
        subAdmins: Array,
        // 🔥 NEW: Tracks when each user cleared their chat
        clearedHistory: [
            {
                userId: String,
                clearedAt: Date,
            }
        ]
    },
    {
        timestamps: true,
    }
);

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;