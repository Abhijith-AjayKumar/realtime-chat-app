import Chat from "../Models/chatModel.js";
import User from "../Models/userModel.js";
import Message from "../Models/messageModel.js";

// ==========================================
// 1-ON-1 CHAT FUNCTIONS
// ==========================================

export const createChat = async (req, res) => {
    const { firstId, secondId } = req.body;

    try {
        const chat = await Chat.findOne({
            members: { $all: [firstId, secondId], $size: 2 },
            isGroup: { $ne: true } 
        });

        if (chat) return res.status(200).json(chat);

        const newChat = new Chat({
            members: [firstId, secondId],
            isGroup: false
        });

        const response = await newChat.save();
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json(error);
    }
};

export const findUserChats = async (req, res) => {
    const userId = req.params.userId;
    try {
        // 🔥 Sorted to load the most recent chats first!
        const chats = await Chat.find({
            members: { $in: [userId] },
        }).sort({ updatedAt: -1 }); 
        
        res.status(200).json(chats);
    } catch (error) {
        console.log(error);
        res.status(500).json(error);
    }
};

export const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        await Chat.findByIdAndDelete(chatId);
        res.status(200).json({ message: "Chat deleted successfully" });
    } catch (error) {
        res.status(500).json(error);
    }
};

// ==========================================
// GROUP CHAT FUNCTIONS & SYSTEM MESSAGES
// ==========================================

export const createGroupChat = async (req, res) => {
    try {
        const { creatorId, groupName, initialMembers } = req.body;

        if (!groupName || !creatorId) {
            return res.status(400).json({ message: "Group name and creator ID are required." });
        }

        const uniqueMembers = Array.from(new Set([creatorId, ...(initialMembers || [])]));

        const newGroup = new Chat({
            members: uniqueMembers,
            isGroup: true,
            groupName: groupName,
            groupAdmin: creatorId,
            subAdmins: []
        });

        const response = await newGroup.save();
        res.status(200).json(response);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error creating group chat." });
    }
};

export const addMembersToGroup = async (req, res) => {
    try {
        const { chatId, requesterId, newUserIds } = req.body; 

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ message: "Group chat not found." });

        const isMainAdmin = chat.groupAdmin === requesterId;
        const isSubAdmin = chat.subAdmins.includes(requesterId);

        if (!isMainAdmin && !isSubAdmin) {
            return res.status(403).json({ message: "Permission denied. Only admins can add members." });
        }

        const admin = await User.findById(requesterId);
        const newMembers = await User.find({ _id: { $in: newUserIds } });
        const memberNames = newMembers.map(m => m.name).join(", ");

        const updatedMembers = Array.from(new Set([...chat.members, ...newUserIds]));
        chat.members = updatedMembers;
        await chat.save();

        // 🔥 Generate System Message
        const systemMessage = new Message({
            chatId,
            senderId: "SYSTEM",
            text: `${admin.name} added ${memberNames} to the group.`
        });
        await systemMessage.save();

        res.status(200).json({ chat, systemMessage });
    } catch (error) {
        res.status(500).json({ message: "Error adding group members." });
    }
};

export const promoteToSubAdmin = async (req, res) => {
    try {
        const { chatId, adminId, targetUserId } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ message: "Group chat not found." });

        if (chat.groupAdmin !== adminId) {
            return res.status(403).json({ message: "Only the main admin can promote sub-admins." });
        }
        if (chat.subAdmins.includes(targetUserId)) {
            return res.status(400).json({ message: "User is already a sub-admin." });
        }
        if (chat.subAdmins.length >= 3) {
            return res.status(400).json({ message: "Maximum limit of 3 sub-admins reached." });
        }

        chat.subAdmins.push(targetUserId);
        await chat.save();

        // 🔥 Generate System Message
        const admin = await User.findById(adminId);
        const targetUser = await User.findById(targetUserId);
        const systemMessage = new Message({
            chatId,
            senderId: "SYSTEM",
            text: `${admin.name} promoted ${targetUser.name} to Sub-Admin.`
        });
        await systemMessage.save();

        res.status(200).json({ chat, systemMessage });
    } catch (error) {
        res.status(500).json({ message: "Error promoting user." });
    }
};

export const demoteSubAdmin = async (req, res) => {
    try {
        const { chatId, adminId, targetUserId } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ message: "Group chat not found." });

        if (chat.groupAdmin !== adminId) {
            return res.status(403).json({ message: "Only the main admin can remove sub-admins." });
        }

        chat.subAdmins = chat.subAdmins.filter(id => id !== targetUserId);
        await chat.save();

        // 🔥 Generate System Message
        const admin = await User.findById(adminId);
        const targetUser = await User.findById(targetUserId);
        const systemMessage = new Message({
            chatId,
            senderId: "SYSTEM",
            text: `${admin.name} demoted ${targetUser.name} to standard member.`
        });
        await systemMessage.save();

        res.status(200).json({ chat, systemMessage });
    } catch (error) {
        res.status(500).json({ message: "Error removing sub-admin role." });
    }
};

export const removeMember = async (req, res) => {
    try {
        const { chatId, adminId, targetUserId } = req.body;
        const chat = await Chat.findById(chatId);
        
        if (chat.groupAdmin !== adminId) return res.status(403).json("Only Admin can remove members");

        chat.members = chat.members.filter(m => m !== targetUserId);
        chat.subAdmins = chat.subAdmins.filter(m => m !== targetUserId); 
        await chat.save();

        // 🔥 Generate System Message
        const admin = await User.findById(adminId);
        const targetUser = await User.findById(targetUserId);
        const systemMessage = new Message({
            chatId,
            senderId: "SYSTEM",
            text: `${admin.name} removed ${targetUser.name} from the group.`
        });
        await systemMessage.save();

        res.status(200).json({ chat, systemMessage });
    } catch (error) {
        res.status(500).json({ message: "Error removing member." });
    }
};

export const leaveGroupChat = async (req, res) => {
    try {
        const { chatId, userId } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ message: "Group chat not found." });

        if (chat.groupAdmin === userId) {
            await Chat.findByIdAndDelete(chatId);
            return res.status(200).json({ message: "Group deleted successfully because the main admin left.", deleted: true, chatId });
        }

        chat.members = chat.members.filter(id => id !== userId);
        chat.subAdmins = chat.subAdmins.filter(id => id !== userId);
        await chat.save();

        // 🔥 Generate System Message
        const leavingUser = await User.findById(userId);
        const systemMessage = new Message({
            chatId,
            senderId: "SYSTEM",
            text: `${leavingUser.name} left the group.`
        });
        await systemMessage.save();

        res.status(200).json({ chat, systemMessage, deleted: false });
    } catch (error) {
        res.status(500).json({ message: "Error processing group exit." });
    }
};