import { useContext, useState } from "react";
import { Container, Row, Col, Stack, Form } from "react-bootstrap";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import { useLocation, useNavigate } from "react-router-dom";
import UserChat from "../components/UserChat";
import ChatBox from "../components/ChatBox";
import SearchUser from "../components/SearchUser"; 
import Profile from "./Profile"; 

const Chat = () => {
    const { user } = useContext(AuthContext);
    const { userChats, isUserChatsLoading, updateCurrentChat, allUsers } = useContext(ChatContext);
    
    const location = useLocation();
    const navigate = useNavigate();
    const isProfilePage = location.pathname === "/profile";

    // New State: Live filtering string for sidebar conversations
    const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");

    const handleChatClick = (chat) => {
        updateCurrentChat(chat);
        if (isProfilePage) navigate("/");
    };

    // ===================================
    // REAL-TIME CONVERSATION FILTER ENGINE
    // ===================================
    const filteredChats = userChats?.filter((chat) => {
        if (!sidebarSearchQuery.trim()) return true;
        const query = sidebarSearchQuery.toLowerCase();

        if (chat.isGroup) {
            // Match against group names
            return chat.groupName?.toLowerCase().includes(query);
        } else {
            // Match against the solved Direct Message recipient user name
            const recipientId = chat.members?.find((id) => id !== user?._id);
            const recipient = allUsers?.find((u) => u._id === recipientId);
            return recipient?.name?.toLowerCase().includes(query);
        }
    });

    return (
        <Container fluid="md" className="px-3 pb-4">
            {/* SEARCH UTILITIES ROW */}
            {!isProfilePage && (
                <Row className="mb-3">
                    <Col xs={12}>
                        <SearchUser />
                    </Col>
                </Row>
            )} 

            {/* MAIN DASHBOARD DYNAMIC GRID FRAME */}
            <Row className="g-4">
                {/* LEFT ACTIVE CONVERSATIONS BAR */}
                <Col xs={12} md={4} className={isProfilePage ? "d-none d-md-block" : ""}>
                    <Stack gap={2} className="p-2 card-material" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                        
                        <div className="p-2 border-bottom border-secondary mb-1">
                            <h5 className="m-0" style={{ color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Active Chats
                            </h5>
                        </div>

                        {/* --- INLINE SIDEBAR SEARCH FIELD --- */}
                        <div className="px-1 mb-2">
                            <Form.Control
                                type="text"
                                placeholder="🔍 Search chat or friend name..."
                                value={sidebarSearchQuery}
                                onChange={(e) => setSidebarSearchQuery(e.target.value)}
                                style={{
                                    backgroundColor: "var(--bg-main)",
                                    color: "#ffffff",
                                    borderColor: "#2b2b2b",
                                    borderRadius: "50px",
                                    padding: "0.5rem 1.2rem",
                                    fontSize: "0.85rem"
                                }}
                            />
                        </div>
                        
                        {isUserChatsLoading && <p className="text-center my-3" style={{ color: "var(--text-secondary)" }}>Loading chats...</p>}
                        
                        {filteredChats?.length === 0 && (
                            <p className="text-center my-4 p-2" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                {userChats?.length === 0 
                                    ? "No active contacts found." 
                                    : "No matching conversations found."}
                            </p>
                        )}
                        
                        {filteredChats?.map((chat, index) => (
                            <div key={index} onClick={() => handleChatClick(chat)}>
                                <UserChat chat={chat} user={user} />
                            </div>
                        ))}
                    </Stack>
                </Col>

                {/* RIGHT MAIN WINDOW AREA */}
                <Col xs={12} md={8}>
                    {isProfilePage ? <Profile /> : <ChatBox />}
                </Col>
            </Row>
        </Container>
    );
};

export default Chat;