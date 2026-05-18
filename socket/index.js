import { Server } from "socket.io";

const initSocketServer = (expressServer) => {
    const io = new Server(expressServer, {
        cors: {
            origin: "http://localhost:5173", // URL of your frontend
            methods: ["GET", "POST"]
        },
    });

    let onlineUsers = [];

    io.on("connection", (socket) => {
        console.log("Connected device tracking ID:", socket.id);

        // 1. Synchronized User Registration Pipeline
        socket.on("registerUser", (userId) => {
            if (!onlineUsers.some((user) => user.userId === userId)) {
                onlineUsers.push({
                    userId,
                    socketId: socket.id,
                });
            }
            console.log("Current Live Roster:", onlineUsers);
            // Broadcast the active users list globally
            io.emit("getOnlineUsers", onlineUsers);
        });

        // 2. Active Room Subscriptions (For Group Chats and Private DMs)
        socket.on("joinRoom", (roomId) => {
            socket.join(roomId);
            console.log(`Socket ${socket.id} joined conversation room: ${roomId}`);
        });

        // 3. Multi-Tiered Real-Time Message Broadcaster
        socket.on("sendMessage", (message) => {
            // Step A: Broadcast instantly to all users active inside the target room channel
            socket.to(message.chatId).emit("receiveMessage", message);

            // Step B: Multi-member fallback processing (notifies offline/inactive viewports)
            if (message.roomMembers) {
                message.roomMembers.forEach((memberId) => {
                    const recipient = onlineUsers.find((user) => user.userId === memberId);
                    
                    // Route the data payload directly to their open connection pipe
                    if (recipient && recipient.socketId !== socket.id) {
                        io.to(recipient.socketId).emit("receiveMessage", message);
                    }
                });
            }
        });

        // 4. Connection Lifecycle Cleanup
        socket.on("disconnect", () => {
            console.log("Device disconnected safely:", socket.id);
            onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
            io.emit("getOnlineUsers", onlineUsers);
        });
    });

    return io;
};

export default initSocketServer;