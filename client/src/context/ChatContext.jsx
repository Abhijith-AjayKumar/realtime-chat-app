import { createContext, useState, useEffect, useCallback, useContext } from "react";
import { baseUrl, getRequest, postRequest, putRequest, deleteRequest } from "../utils/services";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext"; // Import AuthContext to sync state

export const ChatContext = createContext();

export const ChatContextProvider = ({ children, user }) => {
    // Import the sync function from AuthContext
    const { updateUserBlockedList } = useContext(AuthContext);

    const [userChats, setUserChats] = useState([]);
    const [isUserChatsLoading, setIsUserChatsLoading] = useState(false);
    const [currentChat, setCurrentChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [notifications, setNotifications] = useState([]); 
    
    // Block tracking state
    const [blockedUsersList, setBlockedUsersList] = useState(user?.blockedUsers || []);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        setBlockedUsersList(user?.blockedUsers || []);
    }, [user]);

    // Socket Initialization
    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000");
        setSocket(newSocket);
        return () => newSocket.disconnect();
    }, [user]);

    useEffect(() => {
        if (!socket || !user?._id) return;
        socket.emit("registerUser", user._id);
        userChats?.forEach((chat) => socket.emit("joinRoom", chat._id));
    }, [socket, user, userChats]);

    // Listeners
    useEffect(() => {
        if (!socket) return;
        
        socket.on("getOnlineUsers", (res) => setOnlineUsers(res));
        socket.on("receiveMessage", (newMessage) => {
            if (currentChat?._id === newMessage.chatId) {
                setMessages((prev) => [...prev, newMessage]);
            } else {
                setNotifications((prev) => [newMessage, ...prev]);
            }
        });

        return () => {
            socket.off("getOnlineUsers");
            socket.off("receiveMessage");
        };
    }, [socket, currentChat]);

    // Fetch Data
    useEffect(() => {
        const getUsers = async () => {
            const response = await getRequest(`${baseUrl}/users`);
            if (!response.error) setAllUsers(response);
        };
        getUsers();
    }, [user]);

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

    const updateCurrentChat = useCallback((chat) => {
        setCurrentChat(chat);
        setNotifications((prev) => prev.filter((n) => n.chatId !== chat._id));
    }, []);

    const sendTextMessage = useCallback(async (textMessage, sender, currentChatId, setTextMessage) => {
        if (!textMessage.trim()) return;
        const response = await postRequest(`${baseUrl}/messages`, { chatId: currentChatId, senderId: sender._id, text: textMessage });
        if (!response.error) {
            setMessages((prev) => [...prev, response]);
            setTextMessage("");
            if (socket) socket.emit("sendMessage", { ...response, roomMembers: currentChat?.members });
        }
    }, [socket, currentChat]);

    const createChat = useCallback(async (firstId, secondId) => {
        const response = await postRequest(`${baseUrl}/chats`, { firstId, secondId });
        if (!response.error) {
            setUserChats((prev) => [...prev, response]);
            if (socket) socket.emit("joinRoom", response._id);
        }
    }, [socket]);

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
        const response = await putRequest(`${baseUrl}/chats/group/add-members`, { chatId, requesterId: user._id, newUserIds });
        if (!response.error) { setCurrentChat(response); setUserChats(prev => prev.map(c => c._id === chatId ? response : c)); }
    }, [user]);

    const promoteToSubAdmin = useCallback(async (chatId, targetUserId) => {
        const response = await putRequest(`${baseUrl}/chats/group/promote`, { chatId, adminId: user._id, targetUserId });
        if (!response.error) { setCurrentChat(response); setUserChats(prev => prev.map(c => c._id === chatId ? response : c)); }
    }, [user]);

    const demoteSubAdmin = useCallback(async (chatId, targetUserId) => {
        const response = await putRequest(`${baseUrl}/chats/group/demote`, { chatId, adminId: user._id, targetUserId });
        if (!response.error) { setCurrentChat(response); setUserChats(prev => prev.map(c => c._id === chatId ? response : c)); }
    }, [user]);

    const leaveGroupChat = useCallback(async (chatId) => {
        const response = await putRequest(`${baseUrl}/chats/group/leave`, { chatId, userId: user._id });
        if (!response.error) { setUserChats(prev => prev.filter(c => c._id !== chatId)); setCurrentChat(null); }
    }, [user]);

    // Action Handlers: Blocking (Syncs to both Context AND Auth/LocalStorage)
    const toggleBlockState = useCallback(async (currentUserId, targetUserId) => {
        const response = await putRequest(`${baseUrl}/users/toggle-block`, { currentUserId, targetUserId });
        if (!response.error) {
            setBlockedUsersList(response);
            updateUserBlockedList(response); // Sync to AuthContext/LocalStorage
        } 
    }, [updateUserBlockedList]);

    const unblockSelectedUsers = useCallback(async (currentUserId, targetUserIds) => {
        const response = await putRequest(`${baseUrl}/users/unblock-multiple`, { currentUserId, targetUserIds });
        if (!response.error) {
            setBlockedUsersList(response);
            updateUserBlockedList(response); // Sync to AuthContext/LocalStorage
        }
    }, [updateUserBlockedList]);

    return (
        <ChatContext.Provider value={{ 
            onlineUsers, notifications, userChats, isUserChatsLoading, currentChat, messages, isMessagesLoading, 
            sendTextMessage, createChat, updateCurrentChat, deleteChat, clearMessages, allUsers, 
            createGroupChat, addMembersToGroup, promoteToSubAdmin, demoteSubAdmin, leaveGroupChat,
            blockedUsersList, toggleBlockState, unblockSelectedUsers 
        }}>
            {children}
        </ChatContext.Provider>
    );
};