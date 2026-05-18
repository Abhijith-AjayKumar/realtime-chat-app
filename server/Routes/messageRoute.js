import express from "express";
import { createMessage, getMessages, deleteMessages } from "../controllers/messageController.js"; // <-- add deleteMessages here

const router = express.Router();

router.post("/", createMessage);
router.get("/:chatId", getMessages);
router.delete("/:chatId", deleteMessages); // <-- Add this line!

export default router;