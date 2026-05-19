import { useContext } from "react";
import { ChatContext } from "../context/ChatContext";

const UserChat = ({ chat, user }) => {
    // Bring in notifications from Context
    const { allUsers, onlineUsers, notifications } = useContext(ChatContext);

    // Identify the other user in the DM conversation
    const recipientId = chat?.members?.find((id) => id !== user?._id);
    const recipient = allUsers?.find((u) => u._id === recipientId);

    // Determine if recipient is currently online
    const isOnline = onlineUsers?.some((u) => u.userId === recipientId);

    // Calculate unread messages specifically for this chat room
    const unreadCount = notifications?.filter((n) => n.chatId === chat._id).length;

    if (chat.isGroup) {
        return (
            <div className="d-flex align-items-center justify-content-between p-2 rounded-3 text-white mb-2" style={{ backgroundColor: "var(--bg-main)", cursor: "pointer" }}>
                <div className="d-flex align-items-center gap-3">
                    <div className="d-flex justify-content-center align-items-center text-white rounded-circle" style={{ width: "45px", height: "45px", fontWeight: "bold", backgroundColor: "var(--accent-purple)" }}>
                        {chat.groupName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="fw-bold">{chat.groupName}</div>
                        <small style={{ color: unreadCount > 0 ? "var(--accent-blue)" : "var(--text-secondary)", fontWeight: unreadCount > 0 ? "bold" : "normal" }}>
                            {unreadCount > 0 ? "New Message in Group!" : "Group Chat Room"}
                        </small>
                    </div>
                </div>
                
                {/* Group Unread Notification Badge */}
                {unreadCount > 0 && (
                    <div className="d-flex justify-content-center align-items-center text-white rounded-circle shadow-sm" style={{ backgroundColor: "#ef4444", width: "24px", height: "24px", fontSize: "0.75rem", fontWeight: "bold" }}>
                        {unreadCount}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="d-flex align-items-center justify-content-between p-2 rounded-3 text-white mb-2 position-relative" style={{ backgroundColor: "var(--bg-main)", cursor: "pointer" }}>
            <div className="d-flex align-items-center gap-3">
                {/* Avatar with Status Badge Overlay */}
                <div className="position-relative">
                    <div className="d-flex justify-content-center align-items-center text-white rounded-circle" style={{ width: "45px", height: "45px", fontWeight: "bold", backgroundColor: "var(--accent-blue)" }}>
                        {recipient?.name?.charAt(0).toUpperCase()}
                    </div>
                    <span 
                        className="position-absolute bottom-0 end-0 rounded-circle" 
                        style={{ 
                            width: "12px", 
                            height: "12px", 
                            backgroundColor: isOnline ? "#22c55e" : "#64748b",
                            border: "2px solid var(--bg-surface)",
                            boxShadow: isOnline ? "0 0 8px #22c55e" : "none"
                        }}
                    />
                </div>
                
                <div className="flex-grow-1">
                    <div className="fw-bold">{recipient?.name || "Loading..."}</div>
                    {/* Make text pop out if there is an unread message */}
                    <small style={{ color: unreadCount > 0 ? "var(--accent-blue)" : "var(--text-secondary)", fontWeight: unreadCount > 0 ? "bold" : "normal" }}>
                        {unreadCount > 0 ? "New Message!" : (isOnline ? "Online" : "Tap to open window")}
                    </small>
                </div>
            </div>

            {/* DM Unread Notification Badge */}
            {unreadCount > 0 && (
                <div className="d-flex justify-content-center align-items-center text-white rounded-circle shadow-sm" style={{ backgroundColor: "#ef4444", width: "24px", height: "24px", fontSize: "0.75rem", fontWeight: "bold" }}>
                    {unreadCount}
                </div>
            )}
        </div>
    );
};

export default UserChat;