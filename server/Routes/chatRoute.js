import express from "express";
import { 
    createChat, 
    findUserChats, 
    deleteChat, 
    createGroupChat, 
    addMembersToGroup, 
    promoteToSubAdmin, 
    demoteSubAdmin, 
    removeMember, 
    leaveGroupChat 
} from "../Controllers/chatController.js";

const router = express.Router();

// --- 1-ON-1 CHAT ROUTES ---
router.post("/", createChat);
router.get("/:userId", findUserChats);
router.delete("/:chatId", deleteChat);

// --- GROUP CHAT ROUTES ---
router.post("/group", createGroupChat);
router.put("/group/add-members", addMembersToGroup);
router.put("/group/promote", promoteToSubAdmin);
router.put("/group/demote", demoteSubAdmin);
router.put("/group/remove-member", removeMember);
router.put("/group/leave", leaveGroupChat);

export default router;