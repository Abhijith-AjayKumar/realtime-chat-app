import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Route Imports
import userRoute from "./Routes/userRoute.js";
import chatRoute from "./Routes/chatRoute.js";
import messageRoute from "./Routes/messageRoute.js";
import momentRoute from "./Routes/momentRoute.js";

// Clean Module Socket Import
import initSocketServer from "../socket/index.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));

// Routes
app.use("/app/users", userRoute);
app.use("/app/chats", chatRoute);
app.use("/app/messages", messageRoute);
app.use("/app/moments", momentRoute);

const PORT = process.env.PORT || 5000;
const uri = process.env.ATLAS_URI;

// Start Express Server
const expressServer = app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});

// Database Connection
mongoose.connect(uri)
.then(() => console.log("MongoDB connection established"))
.catch((error) => console.log("MongoDB connection failed: ", error.message));

// --- INITIALIZE EXTERNAL SOCKET MODULE ---
initSocketServer(expressServer);