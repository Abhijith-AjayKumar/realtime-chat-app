import { useContext, useState, useRef, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import { Stack, Form, Button } from "react-bootstrap";
import moment from "moment";

const ChatBox = () => {
    const { user } = useContext(AuthContext);
    const { currentChat, messages, isMessagesLoading, sendTextMessage, allUsers, onlineUsers } = useContext(ChatContext);
    const [textMessage, setTextMessage] = useState("");
    const scrollRef = useRef();

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (!currentChat) {
        return (
            <div className="w-100 d-flex justify-content-center align-items-center card-material text-muted text-center" style={{ height: "65vh" }}>
                <div>
                    <h3 className="fs-1 mb-2">💬</h3>
                    <p>No conversation selected yet...</p>
                </div>
            </div>
        );
    }

    if (isMessagesLoading) {
        return <p className="text-center text-white my-5">Loading deep data logs...</p>;
    }

    // Resolve details for Direct Message recipient status tracking
    const recipientId = currentChat?.members?.find((id) => id !== user?._id);
    const recipient = allUsers?.find((u) => u._id === recipientId);
    const isRecipientOnline = onlineUsers?.some((u) => u.userId === recipientId);

    return (
        <Stack gap={4} className="chat-container card-material p-3" style={{ height: "75vh", position: "relative" }}>
            
            {/* --- TOP HEADER ROW BAR --- */}
            <div className="d-flex align-items-center justify-content-between pb-3 border-bottom border-secondary">
                <div className="d-flex align-items-center gap-3">
                    <div className="position-relative">
                        <div className="d-flex justify-content-center align-items-center rounded-circle text-white fw-bold" style={{ width: "40px", height: "40px", backgroundColor: currentChat.isGroup ? "var(--accent-purple)" : "var(--accent-blue)" }}>
                            {currentChat.isGroup ? currentChat.groupName?.charAt(0).toUpperCase() : recipient?.name?.charAt(0).toUpperCase()}
                        </div>
                        {!currentChat.isGroup && (
                            <span 
                                className="position-absolute bottom-0 end-0 rounded-circle" 
                                style={{ 
                                    width: "10px", 
                                    height: "10px", 
                                    backgroundColor: isRecipientOnline ? "#22c55e" : "#64748b",
                                    border: "2px solid var(--bg-surface)"
                                }}
                            />
                        )}
                    </div>
                    <div>
                        <h5 className="m-0 text-white fw-bold">{currentChat.isGroup ? currentChat.groupName : recipient?.name}</h5>
                        {!currentChat.isGroup && (
                            <small style={{ color: isRecipientOnline ? "#22c55e" : "var(--text-secondary)", fontSize: "0.8rem", fontWeight: "500" }}>
                                {isRecipientOnline ? "• Active Now" : "Offline"}
                            </small>
                        )}
                    </div>
                </div>

                {/* Header Actions Buttons Drawer */}
                <div className="d-flex gap-2">
                    <Button size="sm" variant="outline-warning" className="rounded-pill px-3 py-1" style={{ fontSize: "0.8rem" }}>Clear Log</Button>
                    <Button size="sm" variant="outline-danger" className="rounded-pill px-3 py-1" style={{ fontSize: "0.8rem" }}>Block</Button>
                </div>
            </div>

            {/* --- CORE LIVE STREAM MESSAGE MESSAGES BOX --- */}
            <Stack gap={3} className="messages-box px-2" style={{ overflowY: "auto", flexGrow: 1 }}>
                {messages && messages.map((msg, index) => {
                    const isMyMessage = msg.senderId === user?._id;
                    return (
                        <div 
                            key={index} 
                            ref={scrollRef}
                            className={`d-flex flex-column ${isMyMessage ? "align-items-end" : "align-items-start"}`}
                        >
                            <div 
                                className="px-3 py-2 text-white shadow-sm"
                                style={{ 
                                    backgroundColor: isMyMessage ? "var(--accent-blue, #0d6efd)" : "#262626",
                                    borderRadius: isMyMessage ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                                    fontSize: "0.95rem",
                                    maxWidth: "75%", 
                                    width: "fit-content"
                                }}
                            >
                                <span>{msg.text}</span>
                                
                                {/* Info Metadata Strip (Time + Receipt Status) */}
                                <div className="d-flex align-items-center gap-1 mt-1" style={{ 
                                    fontSize: "0.7rem", 
                                    opacity: 0.75,
                                    justifyContent: isMyMessage ? "flex-end" : "flex-start" 
                                }}>
                                    <span>{moment(msg.createdAt).format("h:mm A")}</span>
                                    
                                    {isMyMessage && (
                                        <span style={{ color: isRecipientOnline ? "#60a5fa" : "#94a3b8", fontSize: "0.85rem", marginLeft: "2px" }}>
                                            {isRecipientOnline ? "✓✓" : "✓"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </Stack>

            {/* --- FOOTER SEND COMPONENT DRAWER --- */}
            <Form onSubmit={(e) => { e.preventDefault(); sendTextMessage(textMessage, user, currentChat._id, setTextMessage); }} className="mt-auto">
                <Stack direction="horizontal" gap={2}>
                    <Form.Control
                        type="text"
                        placeholder="Type a message..."
                        value={textMessage}
                        onChange={(e) => setTextMessage(e.target.value)}
                        style={{
                            backgroundColor: "var(--bg-main)",
                            color: "#ffffff",
                            borderColor: "#2b2b2b",
                            borderRadius: "50px",
                            padding: "0.65rem 1.4rem"
                        }}
                    />
                    <Button type="submit" variant="primary" className="rounded-circle d-flex justify-content-center align-items-center" style={{ width: "44px", height: "44px", backgroundColor: "var(--accent-blue)", border: "none" }}>
                        ➔
                    </Button>
                </Stack>
            </Form>
        </Stack>
    );
};

export default ChatBox;