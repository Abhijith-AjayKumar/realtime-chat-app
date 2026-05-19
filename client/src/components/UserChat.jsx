import { useContext } from "react";
import { ChatContext } from "../context/ChatContext";

const UserChat = ({ chat, user }) => {
    const { allUsers, onlineUsers } = useContext(ChatContext);

    // Identify the other user in the DM conversation
    const recipientId = chat?.members?.find((id) => id !== user?._id);
    const recipient = allUsers?.find((u) => u._id === recipientId);

    // Determine if recipient is currently online
    const isOnline = onlineUsers?.some((u) => u.userId === recipientId);

    if (chat.isGroup) {
        return (
            <div className="d-flex align-items-center gap-3 p-2 rounded-3 text-white mb-2" style={{ backgroundColor: "var(--bg-main)", cursor: "pointer" }}>
                <div className="d-flex justify-content-center align-items-center bg-purple text-white rounded-circle" style={{ width: "45px", height: "45px", fontWeight: "bold", backgroundColor: "var(--accent-purple)" }}>
                    {chat.groupName?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="fw-bold">{chat.groupName}</div>
                    <small style={{ color: "var(--text-secondary)" }}>Group Chat Room</small>
                </div>
            </div>
        );
    }

    return (
        <div className="d-flex align-items-center gap-3 p-2 rounded-3 text-white mb-2 position-relative" style={{ backgroundColor: "var(--bg-main)", cursor: "pointer" }}>
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
                <small style={{ color: "var(--text-secondary)" }}>
                    {isOnline ? "Online" : "Tap to open window"}
                </small>
            </div>
        </div>
    );
};

export default UserChat;