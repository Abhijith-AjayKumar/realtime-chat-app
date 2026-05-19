import { createContext, useState, useEffect, useCallback } from "react";
import { baseUrl, getRequest, postRequest, putRequest, deleteRequest } from "../utils/services";
import { io } from "socket.io-client";

export const ChatContext = createContext();

export const ChatContextProvider = ({ children, user }) => {
    const [userChats, setUserChats] = useState([]);
    const [isUserChatsLoading, setIsUserChatsLoading] = useState(false);
    const [userChatsError, setUserChatsError] = useState(null);
    const [currentChat, setCurrentChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [messagesError, setMessagesError] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    
    // Socket State Engine
    const [socket, setSocket] = useState(null);

    // 1. INITIALIZE WEB-SOCKET ENGINE CONNECTION
    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000");
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    // 2. REGISTER USER PATH AND JOIN ACTIVE ROOMS
    useEffect(() => {
        if (!socket || !user?._id) return;

        socket.emit("registerUser", user._id);

        userChats?.forEach((chat) => {
            socket.emit("joinRoom", chat._id);
        });

    }, [socket, user, userChats]);

    // 3. LISTEN FOR INBOUND LIVE MESSAGES & ONLINE USERS
    useEffect(() => {
        if (!socket) return;

        socket.on("receiveMessage", (newMessage) => {
            // Only update active screen if it matches the current chat ID
            if (currentChat?._id !== newMessage.chatId) return;
            setMessages((prev) => [...prev, newMessage]);
        });

        socket.on("getOnlineUsers", (res) => {
            setOnlineUsers(res);
        });

        return () => {
            socket.off("receiveMessage");
            socket.off("getOnlineUsers");
        };
    }, [socket, currentChat]);

    // Fetch all users to map rosters and profiles
    useEffect(() => {
        const getUsers = async () => {
            const response = await getRequest(`${baseUrl}/users`);
            if (!response.error) setAllUsers(response);
        };
        getUsers();
    }, [user]);

    // Fetch active conversations for the logged-in user
    useEffect(() => {
        const getUserChats = async () => {
            if (user?._id) {
                setIsUserChatsLoading(true);
                const response = await getRequest(`${baseUrl}/chats/${user._id}`);
                setIsUserChatsLoading(false);
                if (!response.error) setUserChats(response);
            }
        };
        getUserChats();
    }, [user]);

    // Fetch messages for active chat room
    useEffect(() => {
        const getMessages = async () => {
            if (currentChat?._id) {
                setIsMessagesLoading(true);
                const response = await getRequest(`${baseUrl}/messages/${currentChat._id}`);
                setIsMessagesLoading(false);
                if (!response.error) setMessages(response);
            }
        };
        getMessages();
    }, [currentChat]);

    // Send text message handler
    const sendTextMessage = useCallback(async (textMessage, sender, currentChatId, setTextMessage) => {
        if (!textMessage.trim()) return;

        const response = await postRequest(`${baseUrl}/messages`, { 
            chatId: currentChatId, 
            senderId: sender._id, 
            text: textMessage 
        });

        if (!response.error) {
            setMessages((prev) => [...prev, response]);
            setTextMessage("");

            if (socket) {
                socket.emit("sendMessage", {
                    ...response,
                    roomMembers: currentChat?.members 
                });
            }
        }
    }, [socket, currentChat]);

    const createChat = useCallback(async (firstId, secondId) => {
        const response = await postRequest(`${baseUrl}/chats`, { firstId, secondId });
        if (!response.error) {
            setUserChats((prev) => [...prev, response]);
            if (socket) socket.emit("joinRoom", response._id);
        }
    }, [socket]);

    const updateCurrentChat = useCallback((chat) => setCurrentChat(chat), []);

    const deleteChat = useCallback(async (chatId) => {
        const response = await deleteRequest(`${baseUrl}/chats/${chatId}`);
        if (!response.error) {
            setUserChats((prev) => prev.filter((chat) => chat._id !== chatId));
            setCurrentChat(null);
        }
    }, []);

    const clearMessages = useCallback(async (chatId) => {
        const response = await deleteRequest(`${baseUrl}/messages/${chatId}`);
        if (!response.error) setMessages([]);
    }, []);

    const createGroupChat = useCallback(async (groupName, initialMembers) => {
        if (!user?._id) return;
        const response = await postRequest(`${baseUrl}/chats/group`, { creatorId: user._id, groupName, initialMembers });
        if (!response.error) {
            setUserChats((prev) => [response, ...prev]);
            if (socket) socket.emit("joinRoom", response._id);
        }
    }, [user, socket]);

    const addMembersToGroup = useCallback(async (chatId, newUserIds) => {
        if (!user?._id) return;
        const response = await putRequest(`${baseUrl}/chats/group/add-members`, { chatId, requesterId: user._id, newUserIds });
        if (response.error) return alert(response.message);
        setCurrentChat(response);
        setUserChats((prev) => prev.map(chat => chat._id === chatId ? response : chat));
    }, [user]);

    const promoteToSubAdmin = useCallback(async (chatId, targetUserId) => {
        if (!user?._id) return;
        const response = await putRequest(`${baseUrl}/chats/group/promote`, { chatId, adminId: user._id, targetUserId });
        if (response.error) return alert(response.message);
        setCurrentChat(response);
        setUserChats((prev) => prev.map(chat => chat._id === chatId ? response : chat));
    }, [user]);

    const demoteSubAdmin = useCallback(async (chatId, targetUserId) => {
        if (!user?._id) return;
        const response = await putRequest(`${baseUrl}/chats/group/demote`, { chatId, adminId: user._id, targetUserId });
        if (response.error) return alert(response.message);
        setCurrentChat(response);
        setUserChats((prev) => prev.map(chat => chat._id === chatId ? response : chat));
    }, [user]);

    const leaveGroupChat = useCallback(async (chatId) => {
        if (!user?._id) return;
        const response = await putRequest(`${baseUrl}/chats/group/leave`, { chatId, userId: user._id });
        if (!response.error) {
            setUserChats((prev) => prev.filter(chat => chat._id !== chatId));
            setCurrentChat(null);
        }
    }, [user]);

    return (
        <ChatContext.Provider value={{ onlineUsers, userChats, isUserChatsLoading, userChatsError, currentChat, messages, isMessagesLoading, messagesError, sendTextMessage, createChat, updateCurrentChat, deleteChat, clearMessages, allUsers, createGroupChat, addMembersToGroup, promoteToSubAdmin, demoteSubAdmin, leaveGroupChat }}>
            {children}
        </ChatContext.Provider>
    );
};