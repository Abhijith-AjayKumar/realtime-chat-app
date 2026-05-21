import Message from "../Models/messageModel.js";
import Chat from "../Models/chatModel.js"; 
import User from "../Models/userModel.js";

import mongoose from "mongoose"; // 🔥 Required to generate a fake ID

export const createMessage = async (req, res) => {
    const { chatId, senderId, text, fileData, fileType, fileName } = req.body;

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json("Chat not found");

        // --- ENFORCE SHADOWBAN LOGIC ---
        if (!chat.isGroup) {
            const recipientId = chat.members.find(id => id !== senderId);
            const recipient = await User.findById(recipientId);

            if (recipient?.blockedUsers?.includes(senderId)) {
                // 🔥 Create a fake message object that tricks the sender's UI
                const fakeMessage = {
                    _id: new mongoose.Types.ObjectId(), // Generates a valid MongoDB ID format
                    chatId,
                    senderId,
                    text,
                    fileData,
                    fileType,
                    fileName,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isGhost: true // 🔥 Secret flag to stop the WebSocket delivery
                };
                
                // Return success without saving it to the database!
                return res.status(200).json(fakeMessage); 
            }
        }

        // --- NORMAL MESSAGE LOGIC ---
        const message = new Message({
            chatId,
            senderId,
            text,
            fileData,
            fileType,
            fileName,
        });

        const response = await message.save();
        
        chat.updatedAt = new Date();
        await chat.save();

        res.status(200).json(response);
    } catch (error) {
        console.log("Error creating message:", error);
        res.status(500).json(error);
    }
};

// 2. Get Messages (Now filters out messages before the user's "clearedAt" time)
export const getMessages = async (req, res) => {
    // 🔥 We now grab userId from the URL parameters
    const { chatId, userId } = req.params;

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json("Chat not found");

        // Find if this specific user has cleared the chat in the past
        const userHistory = chat.clearedHistory?.find(h => h.userId === userId);

        let query = { chatId };

        // If they have cleared it, only find messages created AFTER they cleared it
        if (userHistory) {
            query.createdAt = { $gt: userHistory.clearedAt };
        }

        const messages = await Message.find(query);
        res.status(200).json(messages);
    } catch (error) {
        console.log(error);
        res.status(500).json(error);
    }
};

// 3. Clear Messages (Renamed from deleteMessages, updates timestamp instead of deleting)
export const clearMessages = async (req, res) => {
    // 🔥 We now grab userId from the URL parameters
    const { chatId, userId } = req.params;

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json("Chat not found");

        // Check if this user already has a cleared history record
        const historyIndex = chat.clearedHistory?.findIndex(h => h.userId === userId);

        if (historyIndex !== undefined && historyIndex !== -1) {
            // Update the existing timestamp to right now
            chat.clearedHistory[historyIndex].clearedAt = new Date();
        } else {
            // Create a new timestamp record for this user
            if (!chat.clearedHistory) chat.clearedHistory = [];
            chat.clearedHistory.push({ userId, clearedAt: new Date() });
        }

        await chat.save();
        res.status(200).json({ message: "Chat cleared for user" });
    } catch (error) {
        console.log(error);
        res.status(500).json(error);
    }
};

