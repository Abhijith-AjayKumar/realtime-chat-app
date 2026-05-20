import express from "express";
import { createMessage, getMessages, clearMessages } from "../Controllers/messageController.js"; // <-- add deleteMessages here

const router = express.Router();

router.post("/", createMessage);

router.get("/:chatId/:userId", getMessages);
router.delete("/:chatId/:userId", clearMessages);

export default router;