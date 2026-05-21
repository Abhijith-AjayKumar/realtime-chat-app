import { Server } from "socket.io";

const initSocketServer = (expressServer) => {
    const io = new Server(expressServer, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            methods: ["GET", "POST"]
        },
    });

    let onlineUsers = [];

    io.on("connection", (socket) => {
        console.log("Connected device tracking ID:", socket.id);

        // 1. Synchronized User Registration Pipeline
        socket.on("registerUser", (userId) => {
            // Remove any existing socket mapping for this user to handle reconnection cleanly
            onlineUsers = onlineUsers.filter((user) => user.userId !== userId);
            
            onlineUsers.push({
                userId,
                socketId: socket.id,
            });
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

        // 3.5. WebRTC Calling Signaling Pipelines
        socket.on("callUser", ({ userToCall, signalData, from, fromName, fromProfilePic, isVoiceCall }) => {
            const recipient = onlineUsers.find((u) => u.userId === userToCall);
            if (recipient) {
                io.to(recipient.socketId).emit("incomingCall", {
                    signalData,
                    from,
                    fromName,
                    fromProfilePic,
                    isVoiceCall
                });
            }
        });

        socket.on("answerCall", ({ to, signalData }) => {
            const caller = onlineUsers.find((u) => u.userId === to);
            if (caller) {
                io.to(caller.socketId).emit("callAccepted", { signalData });
            }
        });

        socket.on("iceCandidate", ({ to, candidate }) => {
            const peer = onlineUsers.find((u) => u.userId === to);
            if (peer) {
                io.to(peer.socketId).emit("iceCandidate", { candidate });
            }
        });

        socket.on("endCall", ({ to }) => {
            const peer = onlineUsers.find((u) => u.userId === to);
            if (peer) {
                io.to(peer.socketId).emit("endCall");
            }
        });

        socket.on("declineCall", ({ to }) => {
            const peer = onlineUsers.find((u) => u.userId === to);
            if (peer) {
                io.to(peer.socketId).emit("declineCall");
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