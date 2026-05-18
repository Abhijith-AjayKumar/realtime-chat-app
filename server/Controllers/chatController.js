import Chat from "../models/chatModel.js";

export const createChat = async (req, res) => {
    const { firstId, secondId } = req.body;

    try {
        const chat = await Chat.findOne({
            members: { $all: [firstId, secondId] },
        });

        if (chat) return res.status(200).json(chat);

        const newChat = new Chat({
            members: [firstId, secondId],
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
        const chats = await Chat.find({
            members: { $in: [userId] },
        });
        res.status(200).json(chats);
    } catch (error) {
        res.status(500).json(error);
    }
};

export const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        // Find and delete the chat room
        await Chat.findByIdAndDelete(chatId);
        res.status(200).json({ message: "Chat deleted successfully" });
    } catch (error) {
        res.status(500).json(error);
    }
};

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
        res.status(200).json(chat);
    } catch (error) {
        res.status(500).json({ message: "Error promoting user." });
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

        const updatedMembers = Array.from(new Set([...chat.members, ...newUserIds]));
        chat.members = updatedMembers;

        await chat.save();
        res.status(200).json(chat);
    } catch (error) {
        res.status(500).json({ message: "Error adding group members." });
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
        res.status(200).json({ message: "Left group successfully.", deleted: false, chat });
    } catch (error) {
        res.status(500).json({ message: "Error processing group exit." });
    }
};

export const deleteGroupChat = async (req, res) => {
    try {
        const { chatId, userId } = req.params;

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ message: "Group chat not found." });

        if (chat.groupAdmin !== userId) {
            return res.status(403).json({ message: "Permission denied. Only the main admin can delete this group." });
        }

        await Chat.findByIdAndDelete(chatId);
        res.status(200).json({ message: "Group chat removed permanently.", chatId });
    } catch (error) {
        res.status(500).json({ message: "Error deleting group chat." });
    }
};

// New: Demote a Sub-Admin back to a regular member
export const demoteSubAdmin = async (req, res) => {
    try {
        const { chatId, adminId, targetUserId } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ message: "Group chat not found." });

        // Only the Main Admin can strip roles
        if (chat.groupAdmin !== adminId) {
            return res.status(403).json({ message: "Only the main admin can remove sub-admins." });
        }

        // Pull the sub-admin from the array
        chat.subAdmins = chat.subAdmins.filter(id => id !== targetUserId);
        
        await chat.save();
        res.status(200).json(chat);
    } catch (error) {
        res.status(500).json({ message: "Error removing sub-admin role." });
    }
};