import mongoose from "mongoose";

const momentSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        userProfilePic: { type: String },
        media: { type: String, required: true }, // Base64 data or text background details
        mediaType: { type: String, required: true }, // "image", "video", "text"
        text: { type: String }, // Caption or text status contents
    },
    { timestamps: true }
);

export default mongoose.model("Moment", momentSchema);
