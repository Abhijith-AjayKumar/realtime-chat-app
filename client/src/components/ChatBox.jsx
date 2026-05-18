import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import { useFetchRecipientUser } from "../hooks/useFetchRecipient";
import { Stack, Form, Button, Badge } from "react-bootstrap";
import { baseUrl, getRequest } from "../utils/services";

const ChatBox = () => {
    const { user, toggleBlock } = useContext(AuthContext);
    const { currentChat, messages, isMessagesLoading, sendTextMessage, updateCurrentChat, deleteChat, clearMessages, addMembersToGroup, promoteToSubAdmin, demoteSubAdmin, leaveGroupChat } = useContext(ChatContext);
    const { recipientUser } = useFetchRecipientUser(currentChat, user);
    
    const [textMessage, setTextMessage] = useState("");
    const [inviteUserIdInput, setInviteUserIdInput] = useState("");
    const { allUsers } = useContext(ChatContext);

    if (!currentChat) return (
        <div className="d-flex align-items-center justify-content-center card-material" style={{ minHeight: "65vh", width: "100%" }}>
            <p className="m-0" style={{ color: "var(--text-secondary)", fontWeight: "500" }}>No conversation selected yet...</p>
        </div>
    );
    
    if (isMessagesLoading) return (
        <div className="d-flex align-items-center justify-content-center card-material" style={{ minHeight: "65vh", width: "100%" }}>
            <p className="m-0" style={{ color: "var(--text-secondary)" }}>Loading chat data stream...</p>
        </div>
    );

    const isGroup = currentChat?.isGroup;
    const isMainAdmin = isGroup && currentChat?.groupAdmin === user?._id;
    const isSubAdmin = isGroup && currentChat?.subAdmins?.includes(user?._id);
    const canManageMembers = isMainAdmin || isSubAdmin;

    const isBlocked = !isGroup && user?.blockedUsers?.includes(recipientUser?._id);
    const chatTitle = isGroup ? currentChat?.groupName : recipientUser?.name;

    const handleInviteUserSubmit = async (e) => {
        e.preventDefault();
        if (!inviteUserIdInput.trim()) return;

        const response = await getRequest(`${baseUrl}/users/search/${inviteUserIdInput.trim()}`);
        if (response.error) return alert("User handle not found.");
        if (currentChat.members.includes(response._id)) return alert("User is already inside this group.");

        addMembersToGroup(currentChat._id, [response._id]);
        setInviteUserIdInput("");
    };

    return (
        <Stack className="card-material" style={{ width: "100%", height: "75vh", display: "flex", flexDirection: "column" }}>
            
            {/* --- HEADER CONTROLS --- */}
            <div className="chat-header pb-2" style={{ borderBottom: "1px solid #2b2b2b" }}>
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-2">
                    <div className="d-flex align-items-center gap-1">
                        <Button variant="outline-secondary" size="sm" onClick={() => updateCurrentChat(null)} style={{ border: "none", color: "var(--text-secondary)" }}>
                            &larr; <span className="d-none d-sm-inline">Back</span>
                        </Button>
                        <strong style={{ color: "var(--text-primary)", fontSize: "1.15rem" }}>{chatTitle}</strong>
                    </div>

                    <div className="d-flex flex-wrap gap-1">
                        {!isGroup ? (
                            <>
                                <Button variant="outline-warning" size="sm" className="py-1 px-3" onClick={() => clearMessages(currentChat?._id)}>Clear Log</Button>
                                <Button variant={isBlocked ? "secondary" : "outline-danger"} size="sm" className="py-1 px-3" onClick={() => toggleBlock(recipientUser?._id)}>{isBlocked ? "Unblock" : "Block"}</Button>
                                <Button variant="outline-danger" size="sm" className="py-1 px-3" onClick={() => deleteChat(currentChat?._id)}>Unfriend</Button>
                            </>
                        ) : (
                            isMainAdmin ? (
                                <Button variant="danger" size="sm" className="py-1 px-3" onClick={() => leaveGroupChat(currentChat._id)}>Delete Group</Button>
                            ) : (
                                <Button variant="outline-danger" size="sm" className="py-1 px-3" onClick={() => leaveGroupChat(currentChat._id)}>Leave Group</Button>
                            )
                        )}
                    </div>
                </div>

                {/* --- PILLED ROSTER UTILITY --- */}
                {isGroup && (
                    <Stack gap={2} className="p-2 rounded-4 mt-2" style={{ fontSize: "0.8rem", backgroundColor: "var(--bg-main)" }}>
                        <div className="d-flex flex-wrap align-items-center gap-1">
                            <span style={{ color: "var(--text-secondary)", marginRight: "4px" }}>Roster:</span>
                            {allUsers?.filter(u => currentChat.members.includes(u._id)).map(member => {
                                const mIsAdmin = currentChat.groupAdmin === member._id;
                                const mIsSub = currentChat.subAdmins.includes(member._id);
                                
                                return (
                                    <Badge 
                                        key={member._id} 
                                        bg={mIsAdmin ? "danger" : mIsSub ? "warning" : "secondary"}
                                        className="p-2 m-1 rounded-pill"
                                        style={{ cursor: isMainAdmin && !mIsAdmin ? "pointer" : "default" }}
                                        onClick={() => {
                                            if (!isMainAdmin || mIsAdmin) return;
                                            if (mIsSub) demoteSubAdmin(currentChat._id, member._id);
                                            else {
                                                if (currentChat.subAdmins.length >= 3) return alert("Limit of 3 sub-admins reached.");
                                                promoteToSubAdmin(currentChat._id, member._id);
                                            }
                                        }}
                                    >
                                        {member.name}{mIsAdmin && " ★"}{mIsSub && " 🛠"}
                                    </Badge>
                                );
                            })}
                        </div>

                        {canManageMembers && (
                            <Form onSubmit={handleInviteUserSubmit} className="mt-1">
                                <Stack direction="horizontal" gap={2}>
                                    <Form.Control 
                                        type="text"
                                        size="sm"
                                        placeholder="Invite via unique id handle..."
                                        value={inviteUserIdInput}
                                        onChange={(e) => setInviteUserIdInput(e.target.value)}
                                        style={{ backgroundColor: "var(--bg-input)", borderColor: "#3f3f3f" }}
                                    />
                                    <Button type="submit" size="sm" variant="outline-success" className="px-3">Invite</Button>
                                </Stack>
                            </Form>
                        )}
                    </Stack>
                )}
            </div>

            {/* --- TIMELINE MESSAGES LOG --- */}
            <Stack gap={2} className="messages flex-grow-1 my-3" style={{ overflowY: "auto", paddingRight: "5px" }}>
                {messages?.map((message, index) => {
                    const senderName = allUsers?.find(u => u._id === message?.senderId)?.name || "User";
                    const isMe = message?.senderId === user?._id;
                    return (
                        <div 
                            key={index} 
                            style={{
                                alignSelf: isMe ? "flex-end" : "flex-start",
                                backgroundColor: isMe ? "var(--accent-blue)" : "var(--bg-card-active)",
                                color: "white",
                                padding: "10px 16px",
                                borderRadius: "var(--radius-bubble)",
                                maxWidth: "80%",
                                wordBreak: "break-word"
                            }}
                        >
                            {isGroup && !isMe && (
                                <small style={{ display: "block", color: "#b388ff", fontWeight: "bold", fontSize: "0.7rem", marginBottom: "2px" }}>
                                    {senderName}
                                </small>
                            )}
                            <span style={{ fontSize: "0.95rem" }}>{message.text}</span>
                        </div>
                    );
                })}
            </Stack>

            {/* --- HIGH-VISIBILITY CAPSULE TEXT INPUT HUB --- */}
            <Stack direction="horizontal" gap={2} className="chat-input mt-auto pt-2" style={{ borderTop: "1px solid #2b2b2b" }}>
                <Form.Control 
                    type="text" 
                    placeholder={isBlocked ? "Unblock this user to type messages." : "Type a message..."} 
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    disabled={isBlocked} 
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !isBlocked) {
                            e.preventDefault();
                            sendTextMessage(textMessage, user, currentChat?._id, setTextMessage);
                        }
                    }}
                    style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", borderColor: "#3f3f3f" }}
                />
                <Button 
                    variant="primary" 
                    onClick={() => sendTextMessage(textMessage, user, currentChat?._id, setTextMessage)}
                    disabled={isBlocked}
                    style={{ borderRadius: "50% !important", width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0" }}
                >
                    ➔
                </Button>
            </Stack>
        </Stack>
    );
};

export default ChatBox;