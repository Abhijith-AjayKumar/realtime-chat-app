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
    const { currentChat, userChats, isUserChatsLoading, updateCurrentChat, allUsers } = useContext(ChatContext);
    
    const location = useLocation();
    const navigate = useNavigate();
    const isProfilePage = location.pathname === "/profile";
    const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");

    const handleChatClick = (chat) => {
        updateCurrentChat(chat);
        if (isProfilePage) navigate("/");
    };

    // 1. First, filter the chats based on the search query
    const filteredChats = userChats?.filter((chat) => {
        if (!sidebarSearchQuery.trim()) return true;
        const query = sidebarSearchQuery.toLowerCase();
        if (chat.isGroup) return chat.groupName?.toLowerCase().includes(query);
        const recipientId = chat.members?.find((id) => id !== user?._id);
        const recipient = allUsers?.find((u) => u._id === recipientId);
        return recipient?.name?.toLowerCase().includes(query);
    });

    // 2. Then, sort the filtered chats by the latest timestamp (Latest on top)
    const sortedChats = filteredChats?.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
    });

    return (
        <Container fluid="md" className="px-3 pb-4">
            {!isProfilePage && <Row className="mb-3"><Col xs={12}><SearchUser /></Col></Row>} 
            <Row className="g-4">
                <Col xs={12} md={4} className={isProfilePage ? "d-none d-md-block" : (currentChat ? "d-none d-md-block" : "")}>
                    <Stack gap={2} className="p-2 card-material" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                        <div className="p-2 mb-1" style={{ borderBottom: "1px solid var(--accent-border)" }}>
                            <h5 className="m-0" style={{ color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: "600", textTransform: "uppercase" }}>Active Chats</h5>
                        </div>
                        <div className="px-1 mb-2">
                            <div className="position-relative d-flex align-items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ color: "#a3a3a3", position: "absolute", left: "16px", zIndex: 10 }}>
                                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                                </svg>
                                <Form.Control
                                    type="text"
                                    placeholder="Search chat or friend name..."
                                    value={sidebarSearchQuery}
                                    onChange={(e) => setSidebarSearchQuery(e.target.value)}
                                    className="search-control"
                                    style={{ backgroundColor: "var(--bg-main)", color: "var(--text-primary)", borderColor: "var(--accent-border)", borderRadius: "50px", fontSize: "0.85rem", paddingLeft: "2.8rem" }}
                                />
                            </div>
                        </div>
                        
                        {isUserChatsLoading && <p className="text-center my-3" style={{ color: "var(--text-secondary)" }}>Loading chats...</p>}
                        {sortedChats?.length === 0 && <p className="text-center my-4 p-2" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No matching conversations found.</p>}
                        
                        {/* Map over sortedChats instead of filteredChats */}
                        {sortedChats?.map((chat) => (
                            <div key={chat._id} onClick={() => handleChatClick(chat)}>
                                <UserChat chat={chat} user={user} />
                            </div>
                        ))}
                        
                    </Stack>
                </Col>
                <Col xs={12} md={8} className={isProfilePage ? "" : (currentChat ? "" : "d-none d-md-block")}>
                    {isProfilePage ? <Profile /> : <ChatBox />}
                </Col>
            </Row>
        </Container>
    );
};

export default Chat;