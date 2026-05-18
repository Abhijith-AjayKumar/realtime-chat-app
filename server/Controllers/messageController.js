import Message from "../models/messageModel.js";

export const createMessage = async (req, res) => {
    const { chatId, senderId, text } = req.body;

    const message = new Message({
        chatId,
        senderId,
        text,
    });

    try {
        const response = await message.save();
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json(error);
    }
};

export const getMessages = async (req, res) => {
    const { chatId } = req.params;

    try {
        const messages = await Message.find({ chatId });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json(error);
    }
};

export const deleteMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        // Delete ALL messages that belong to this chat room
        await Message.deleteMany({ chatId });
        res.status(200).json({ message: "Messages cleared successfully" });
    } catch (error) {
        res.status(500).json(error);
    }
};