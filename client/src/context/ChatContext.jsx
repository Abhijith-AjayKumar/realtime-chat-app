import { createContext, useState, useEffect, useCallback, useContext } from "react";
import { baseUrl, getRequest, postRequest, putRequest, deleteRequest } from "../utils/services";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext"; 

export const ChatContext = createContext();

export const ChatContextProvider = ({ children, user }) => {
    const { updateUserBlockedList, unblockMultiple } = useContext(AuthContext);

    const [userChats, setUserChats] = useState([]);
    const [isUserChatsLoading, setIsUserChatsLoading] = useState(false);
    const [userChatsError, setUserChatsError] = useState(null);
    const [currentChat, setCurrentChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [notifications, setNotifications] = useState([]); 
    const [blockedUsersList, setBlockedUsersList] = useState(user?.blockedUsers || []);
    
    // Read Receipts persistent store
    const [lastReadTimestamps, setLastReadTimestamps] = useState(() => {
        const stored = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith("lastRead_")) {
                    stored[key] = localStorage.getItem(key);
                }
            }
        } catch (e) { console.error(e); }
        return stored;
    });
    
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        setBlockedUsersList(user?.blockedUsers || []);
    }, [user]);

    // 1. INITIALIZE WEB-SOCKET ENGINE CONNECTION
    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000");
        setSocket(newSocket);
        return () => newSocket.disconnect();
    }, [user]);

    // 2. REGISTER USER PATH AND JOIN ACTIVE ROOMS
    useEffect(() => {
        if (!socket || !user?._id) return;
        socket.emit("registerUser", user._id);
        userChats?.forEach((chat) => socket.emit("joinRoom", chat._id));
    }, [socket, user, userChats]);

  // 3. LISTEN FOR INBOUND LIVE MESSAGES
    useEffect(() => {
        if (!socket) return;
        
        socket.on("getOnlineUsers", (res) => setOnlineUsers(res));
        
        socket.on("receiveMessage", (newMessage) => {
            if (newMessage.type === "read_receipt") {
                const key = `lastRead_${newMessage.chatId}_${newMessage.senderId}`;
                setLastReadTimestamps((prev) => {
                    const updated = { ...prev, [key]: newMessage.timestamp };
                    localStorage.setItem(key, newMessage.timestamp);
                    return updated;
                });
                return;
            }

            setUserChats((prevChats) => {
                return prevChats.map((chat) => {
                    if (chat._id === newMessage.chatId) {
                        return { ...chat, updatedAt: new Date().toISOString() };
                    }
                    return chat;
                });
            });

            if (currentChat?._id === newMessage.chatId) {
                // 🔥 FIX: Check if message already exists before adding it
                setMessages((prev) => {
                    if (prev.some(msg => msg._id === newMessage._id)) return prev;
                    return [...prev, newMessage];
                });
            } else {
                setNotifications((prev) => {
                    if (prev.some(n => n._id === newMessage._id)) return prev;
                    return [newMessage, ...prev];
                });
            }
        });

        return () => {
            socket.off("getOnlineUsers");
            socket.off("receiveMessage");
        };
    }, [socket, currentChat]);

    // Automatically emit a read receipt when opening a chat
    useEffect(() => {
        if (!socket || !currentChat || !user) return;

        const sendReceipt = () => {
            const timestamp = new Date().toISOString();
            socket.emit("sendMessage", {
                chatId: currentChat._id,
                senderId: user._id,
                type: "read_receipt",
                timestamp,
                roomMembers: currentChat.members
            });
        };

        sendReceipt();
    }, [currentChat, socket, user]);

    // Automatically emit a read receipt when a new message is received in the active chat
    useEffect(() => {
        if (!socket || !currentChat || !user || !messages || messages.length === 0) return;

        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.senderId !== user._id && lastMsg.type !== "read_receipt") {
            const timestamp = new Date().toISOString();
            socket.emit("sendMessage", {
                chatId: currentChat._id,
                senderId: user._id,
                type: "read_receipt",
                timestamp,
                roomMembers: currentChat.members
            });
        }
    }, [messages, currentChat, socket, user]);
    // Fetch all users
    useEffect(() => {
        const getUsers = async () => {
            try {
                const response = await getRequest(`${baseUrl}/users`);
                if (!response.error) setAllUsers(response);
            } catch(e) { console.error(e); }
        };
        getUsers();
    }, [user]);

    // Fetch active conversations
    useEffect(() => {
        const getUserChats = async () => {
            if (user?._id) {
                setIsUserChatsLoading(true);
                try {
                    const response = await getRequest(`${baseUrl}/chats/${user._id}`);
                    setIsUserChatsLoading(false);
                    if (!response.error) setUserChats(response);
                } catch(e) {
                    setIsUserChatsLoading(false);
                    console.error(e);
                }
            }
        };
        getUserChats();
    }, [user]);

    // Fetch messages for active chat room
    useEffect(() => {
        const getMessages = async () => {
            if (currentChat?._id && user?._id) {
                setIsMessagesLoading(true);
                const response = await getRequest(`${baseUrl}/messages/${currentChat._id}/${user._id}`);
                setIsMessagesLoading(false);
                if (!response.error) setMessages(response);
            }
        };
        getMessages();
    }, [currentChat, user]);

    // Send text message handler
   const sendTextMessage = useCallback(async (textMessage, sender, currentChatId, setTextMessage) => {
        if (!textMessage.trim()) return;

        const response = await postRequest(`${baseUrl}/messages`, { 
            chatId: currentChatId, senderId: sender._id, text: textMessage 
        });

        if (!response.error) {
            // Adds the message to the sender's screen instantly
            setMessages((prev) => [...prev, response]);
            setTextMessage("");

            setUserChats((prevChats) => {
                return prevChats.map((chat) => {
                    if (chat._id === currentChatId) return { ...chat, updatedAt: new Date().toISOString() };
                    return chat;
                });
            });

            // 🔥 CRITICAL FIX: Only emit the live socket event if it is NOT a ghost message
            if (socket && !response.isGhost) {
                socket.emit("sendMessage", { ...response, roomMembers: currentChat?.members });
            }
        } else {
            alert(response.message || "Failed to send message.");
        }
    }, [socket, currentChat]);

    const createChat = useCallback(async (firstId, secondId) => {
        const response = await postRequest(`${baseUrl}/chats`, { firstId, secondId });
        if (!response.error) {
            setUserChats((prev) => [...prev, response]);
            if (socket) socket.emit("joinRoom", response._id);
        }
    }, [socket]);

    const updateCurrentChat = useCallback((chat) => {
        setCurrentChat(chat);
        setNotifications((prev) => prev.filter((n) => n.chatId !== chat._id));
    }, []);

    const deleteChat = useCallback(async (chatId) => {
        const response = await deleteRequest(`${baseUrl}/chats/${chatId}`);
        if (!response.error) {
            setUserChats((prev) => prev.filter((chat) => chat._id !== chatId));
            setCurrentChat(null);
        }
    }, []);

    const clearMessages = useCallback(async (chatId) => {
        if (!user?._id) return;
        const response = await deleteRequest(`${baseUrl}/messages/${chatId}/${user._id}`);
        
        if (!response.error) {
            setMessages([]);
        }
    }, [user]);

    const createGroupChat = useCallback(async (groupName, initialMembers) => {
        if (!user?._id) return;
        const response = await postRequest(`${baseUrl}/chats/group`, { creatorId: user._id, groupName, initialMembers });
        if (!response.error) {
            setUserChats((prev) => [response, ...prev]);
            if (socket) socket.emit("joinRoom", response._id);
        }
    }, [user, socket]);

    const addMembersToGroup = useCallback(async (chatId, newUserIds) => {
        const response = await putRequest(`${baseUrl}/chats/group/add-members`, { chatId, requesterId: user._id, newUserIds });
        if (!response.error) { 
            // 🔥 SAFE FALLBACK: Checks if the backend sent the new format or the old format
            const updatedChat = response.chat || response;
            setCurrentChat(updatedChat); 
            setUserChats(prev => prev.map(c => c._id === chatId ? updatedChat : c)); 
            
            // Only trigger the system message if the backend successfully generated it
            if (response.systemMessage) {
                setMessages(prev => [...prev, response.systemMessage]);
                if (socket) socket.emit("sendMessage", { ...response.systemMessage, roomMembers: updatedChat.members });
            }
        }
    }, [user, socket]);

    const promoteToSubAdmin = useCallback(async (chatId, targetUserId) => {
        const response = await putRequest(`${baseUrl}/chats/group/promote`, { chatId, adminId: user._id, targetUserId });
        if (!response.error) { 
            const updatedChat = response.chat || response;
            setCurrentChat(updatedChat); 
            setUserChats(prev => prev.map(c => c._id === chatId ? updatedChat : c)); 
            
            if (response.systemMessage) {
                setMessages(prev => [...prev, response.systemMessage]);
                if (socket) socket.emit("sendMessage", { ...response.systemMessage, roomMembers: updatedChat.members });
            }
        }
    }, [user, socket]);

    const demoteSubAdmin = useCallback(async (chatId, targetUserId) => {
        const response = await putRequest(`${baseUrl}/chats/group/demote`, { chatId, adminId: user._id, targetUserId });
        if (!response.error) { 
            const updatedChat = response.chat || response;
            setCurrentChat(updatedChat); 
            setUserChats(prev => prev.map(c => c._id === chatId ? updatedChat : c)); 
            
            if (response.systemMessage) {
                setMessages(prev => [...prev, response.systemMessage]);
                if (socket) socket.emit("sendMessage", { ...response.systemMessage, roomMembers: updatedChat.members });
            }
        }
    }, [user, socket]);

    const removeMember = useCallback(async (chatId, targetUserId) => {
        const response = await putRequest(`${baseUrl}/chats/group/remove-member`, { chatId, adminId: user._id, targetUserId });
        if (!response.error) { 
            const updatedChat = response.chat || response;
            setCurrentChat(updatedChat); 
            setUserChats(prev => prev.map(c => c._id === chatId ? updatedChat : c)); 
            
            if (response.systemMessage) {
                setMessages(prev => [...prev, response.systemMessage]);
                if (socket) socket.emit("sendMessage", { ...response.systemMessage, roomMembers: updatedChat.members });
            }
        }
    }, [user, socket]);

    const leaveGroupChat = async (req, res) => {
    try {
        const { chatId, userId } = req.body;
        const chat = await Chat.findById(chatId);
        
        if (chat.groupAdmin === userId) {
            return res.status(400).json("Admin cannot leave directly. Delete group or transfer admin.");
        }

        // 1. Remove the user from members and subAdmins
        chat.members = chat.members.filter(m => m !== userId);
        chat.subAdmins = chat.subAdmins.filter(m => m !== userId);
        await chat.save();

        // 2. 🔥 Generate the System Message
        const leavingUser = await User.findById(userId);
        const systemMessage = new Message({
            chatId,
            senderId: "SYSTEM",
            text: `${leavingUser.name} left the group.`
        });
        await systemMessage.save();

        // 3. Return both to the frontend
        res.status(200).json({ chat, systemMessage });
    } catch (error) { 
        res.status(500).json({ message: "Error leaving group." }); 
    }
};
    
    

    return (
        <ChatContext.Provider value={{ 
            onlineUsers, notifications, userChats, isUserChatsLoading, currentChat, messages, isMessagesLoading, 
            sendTextMessage, createChat, updateCurrentChat, deleteChat, clearMessages, allUsers, 
            createGroupChat, addMembersToGroup, promoteToSubAdmin, demoteSubAdmin, leaveGroupChat,
            removeMember, blockedUsersList, 
            unblockMultiple, updateUserBlockedList, // 🔥 Passed down here
            lastReadTimestamps
        }}>
            {children}
        </ChatContext.Provider>
    );
};