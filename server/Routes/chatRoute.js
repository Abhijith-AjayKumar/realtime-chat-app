import express from "express";
import { 
    createChat, 
    findUserChats, 
    deleteChat,
    createGroupChat,
    promoteToSubAdmin,
    addMembersToGroup,
    leaveGroupChat,
    deleteGroupChat,
    demoteSubAdmin
} from "../Controllers/chatController.js";

const router = express.Router();

// Direct Messages
router.post("/", createChat);
router.get("/:userId", findUserChats);
router.delete("/:chatId", deleteChat);

// Group Infrastructure API
router.post("/group", createGroupChat);
router.put("/group/promote", promoteToSubAdmin);
router.put("/group/add-members", addMembersToGroup);
router.put("/group/leave", leaveGroupChat);
router.delete("/group/:chatId/:userId", deleteGroupChat);
router.put("/group/demote", demoteSubAdmin);

export default router;