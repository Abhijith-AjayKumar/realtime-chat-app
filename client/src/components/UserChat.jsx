import { Stack } from "react-bootstrap";
import { useFetchRecipientUser } from "../hooks/useFetchRecipient";

const UserChat = ({ chat, user }) => {
    const { recipientUser } = useFetchRecipientUser(chat, user);

    const isGroup = chat?.isGroup;
    const displayName = isGroup ? chat?.groupName : recipientUser?.name;
    const avatarLetter = displayName ? displayName.charAt(0).toUpperCase() : "?";

    return (
        <Stack 
            direction="horizontal" 
            gap={3} 
            className="p-2 mb-1 justify-content-between align-items-center" 
            role="button"
            style={{ 
                cursor: "pointer", 
                borderRadius: "var(--radius-pill)", // Pill shape selection strip
                backgroundColor: "var(--bg-input)",
                transition: "background-color 0.15s ease",
                border: "1px solid rgba(255,255,255,0.03)"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-card-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--bg-input)"}
        >
            <div className="d-flex align-items-center gap-3 overflow-hidden w-100 ps-1">
                <div 
                    className="d-flex justify-content-center align-items-center flex-shrink-0" 
                    style={{ 
                        height: "40px", 
                        width: "40px", 
                        borderRadius: "50%", 
                        backgroundColor: isGroup ? "var(--accent-purple)" : "var(--accent-blue)", 
                        color: "white", 
                        fontWeight: "bold"
                    }}
                >
                    {avatarLetter}
                </div>
                <div className="text-content text-truncate w-100">
                    <div style={{ color: "var(--text-primary)", fontWeight: "500", fontSize: "0.95rem" }} className="text-truncate">
                        {displayName}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }} className="text-truncate">
                        {isGroup ? "Group Chat Room" : "Tap to open window"}
                    </div>
                </div>
            </div>
        </Stack>
    );
};

export default UserChat;