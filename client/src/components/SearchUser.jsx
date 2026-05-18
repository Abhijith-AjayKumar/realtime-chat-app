import { useContext, useState } from "react";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/AuthContext";
import { Form, Button, Stack, Alert, Card, Badge } from "react-bootstrap";
import { baseUrl, getRequest } from "../utils/services";

const SearchUser = () => {
    const { user } = useContext(AuthContext);
    const { createChat, userChats, createGroupChat } = useContext(ChatContext);
    
    // Core Workflow Engine: null (fully collapsed on load), "search", or "group"
    const [activeMode, setActiveMode] = useState(null);

    // One-on-One Search States
    const [searchTerm, setSearchTerm] = useState("");
    const [searchedUser, setSearchedUser] = useState(null);
    const [searchError, setSearchError] = useState(null);

    // Group Creation States
    const [groupName, setGroupName] = useState("");
    const [groupMemberIdInput, setGroupMemberIdInput] = useState("");
    const [groupMembersList, setGroupMembersList] = useState([]); 

    const showTemporaryError = (errorMessage) => {
        setSearchError(errorMessage);
        setTimeout(() => setSearchError(null), 3000);
    };

    const handleModeToggle = (mode) => {
        setSearchError(null);
        setSearchedUser(null);
        if (activeMode === mode) {
            setActiveMode(null);
        } else {
            setActiveMode(mode);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        
        setSearchError(null);
        setSearchedUser(null);

        const response = await getRequest(`${baseUrl}/users/search/${searchTerm.trim()}`);
        
        if (response.error) return showTemporaryError("User not found. Please check the ID.");
        if (response._id === user._id) return showTemporaryError("You cannot chat with yourself!");

        const chatExists = userChats?.some(chat => !chat.isGroup && chat.members.includes(response._id));
        if (chatExists) return showTemporaryError("You are already friends with this user.");

        setSearchedUser(response);
    };

    const handleAddFriend = () => {
        createChat(user._id, searchedUser._id);
        setSearchedUser(null); 
        setSearchTerm("");     
        setActiveMode(null); 
    };

    const handleAddMemberToPendingGroup = async (e) => {
        e.preventDefault();
        if (!groupMemberIdInput.trim()) return;

        setSearchError(null);
        const response = await getRequest(`${baseUrl}/users/search/${groupMemberIdInput.trim()}`);

        if (response.error) return showTemporaryError("User handle not found.");
        if (response._id === user._id) return showTemporaryError("You are automatically the group owner!");
        if (groupMembersList.some(m => m._id === response._id)) return showTemporaryError("User already added to the staging list.");

        setGroupMembersList(prev => [...prev, response]);
        setGroupMemberIdInput("");
    };

    const handleCompileAndCreateGroup = () => {
        if (!groupName.trim()) return showTemporaryError("Please declare a valid group name.");
        
        const memberIds = groupMembersList.map(m._id);
        createGroupChat(groupName.trim(), memberIds);
        
        setGroupName("");
        setGroupMembersList([]);
        setActiveMode(null); 
    };

    // --- Premium Styling Config ---
    const cardStyle = {
        backgroundColor: "var(--bg-surface)",
        borderRadius: "20px", 
        border: "1px solid rgba(255, 255, 255, 0.05)"
    };

    const inputStyle = {
        backgroundColor: "var(--bg-input)",
        color: "#ffffff", 
        borderColor: "#2b2b2b",
        borderRadius: "50px",
        padding: "0.65rem 1.4rem",
        fontSize: "0.95rem"
    };

    return (
        <Card className="shadow-sm mb-3" style={cardStyle}>
            <Card.Body className="p-3">
                
                {/* --- CAPSULE CONTROL BUTTON SWITCHER --- */}
                <div className="p-1 rounded-pill" style={{ backgroundColor: "var(--bg-main)", width: "fit-content" }}>
                    <Stack direction="horizontal" gap={1}>
                        <Button 
                            size="sm" 
                            onClick={() => handleModeToggle("search")}
                            style={{ 
                                backgroundColor: activeMode === "search" ? "var(--accent-blue)" : "transparent", 
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "50px",
                                padding: "0.5rem 1.4rem",
                                fontSize: "0.85rem",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                            }}
                        >
                            <span>🔍</span> Search User
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={() => handleModeToggle("group")}
                            style={{ 
                                backgroundColor: activeMode === "group" ? "var(--accent-purple)" : "transparent", 
                                color: activeMode === "group" ? "#ffffff" : "var(--text-secondary)",
                                border: "none",
                                borderRadius: "50px",
                                padding: "0.5rem 1.4rem",
                                fontSize: "0.85rem",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                            }}
                        >
                            <span>👥</span> Create Group
                        </Button>
                    </Stack>
                </div>

                {/* --- MODE 1: INDIVIDUAL USER SEARCH SECTION (EXPANDABLE) --- */}
                {activeMode === "search" && (
                    <Form onSubmit={handleSearch} className="mt-3 pt-3 border-top" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Stack direction="horizontal" gap={3} style={{ maxWidth: "600px" }}>
                            <Form.Control
                                type="text"
                                placeholder="Enter a friend's Unique ID (e.g., user_a1b2c3)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={inputStyle} 
                            />
                            <Button 
                                type="submit" 
                                className="px-4 text-nowrap"
                                style={{ borderRadius: "50px", backgroundColor: "var(--accent-blue)", border: "none", height: "44px" }}
                            >
                                Find User
                            </Button>
                        </Stack>
                    </Form>
                )}

                {/* --- MODE 2: MULTI-TIERED GROUP INITIALIZATION SECTION (EXPANDABLE) --- */}
                {activeMode === "group" && (
                    /* FIXED: Wrapped the limited width Stack inside a full-width container div to let the border stretch beautifully across the entire card view */
                    <div className="mt-3 pt-3 border-top" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Stack gap={3} style={{ maxWidth: "600px" }}>
                            <Form.Group>
                                <Form.Control
                                    type="text"
                                    placeholder="📁 Give your new group a profile name..."
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    style={inputStyle}
                                />
                            </Form.Group>

                            <Form onSubmit={handleAddMemberToPendingGroup}>
                                <Stack direction="horizontal" gap={3}>
                                    <Form.Control
                                        type="text"
                                        placeholder="🔍 Search user ID handle to invite..."
                                        value={groupMemberIdInput}
                                        onChange={(e) => setGroupMemberIdInput(e.target.value)}
                                        style={inputStyle}
                                    />
                                    <Button 
                                        type="submit" 
                                        variant="outline-secondary" 
                                        className="px-4 text-nowrap"
                                        style={{ borderRadius: "50px", height: "44px" }}
                                    >
                                        ➕ Add Member
                                    </Button>
                                </Stack>
                            </Form>

                            {/* Staged Group Members list */}
                            {groupMembersList.length > 0 && (
                                <div className="d-flex flex-wrap gap-2 p-3" style={{ backgroundColor: "var(--bg-main)", borderRadius: "16px", border: "1px solid #2b2b2b" }}>
                                    {groupMembersList.map(m => (
                                        <Badge 
                                            key={m._id} 
                                            bg="secondary" 
                                            className="p-2 d-flex align-items-center gap-2 rounded-pill" 
                                            style={{ fontSize: "0.8rem", fontWeight: "500", backgroundColor: "var(--bg-card-active)" }}
                                        >
                                            👤 {m.name}
                                            <span 
                                                style={{ cursor: "pointer", color: "var(--accent-danger)", fontWeight: "bold", fontSize: "1rem", lineHeight: "1" }} 
                                                onClick={() => setGroupMembersList(prev => prev.filter(user => user._id !== m._id))}
                                            >
                                                &times;
                                            </span>
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            <Button 
                                onClick={handleCompileAndCreateGroup} 
                                disabled={groupMembersList.length === 0}
                                style={{ backgroundColor: "var(--accent-purple)", border: "none", width: "100%", fontWeight: "600", borderRadius: "50px", height: "44px" }}
                            >
                                🚀 Launch Group Chat Room
                            </Button>
                        </Stack>
                    </div>
                )}

                {/* --- TIMEOUT SYSTEM ALERTS --- */}
                {searchError && (
                    <Alert variant="danger" className="mt-3 p-2 mb-0" style={{ maxWidth: "600px", fontSize: "0.9rem", borderRadius: "12px" }}>
                        ⚠️ {searchError}
                    </Alert>
                )}

                {/* --- ASYNC DISCOVERED USER RESULTS DRAWER --- */}
                {activeMode === "search" && searchedUser && (
                    <Stack 
                        direction="horizontal" 
                        gap={3} 
                        className="mt-3 p-2 align-items-center justify-content-between" 
                        style={{ 
                            backgroundColor: "var(--bg-main)", 
                            borderRadius: "50px", 
                            maxWidth: "600px", 
                            border: "1px solid #2b2b2b" 
                        }}
                    >
                        <div className="d-flex align-items-center gap-2 ps-2">
                            <div 
                                className="d-flex justify-content-center align-items-center" 
                                style={{ 
                                    height: "34px", 
                                    width: "34px", 
                                    borderRadius: "50%", 
                                    backgroundColor: "var(--accent-blue)", 
                                    color: "white", 
                                    fontWeight: "bold" 
                                }}
                            >
                                {searchedUser.name.charAt(0).toUpperCase()}
                            </div>
                            <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>{searchedUser.name}</strong>
                        </div>
                        <Button variant="success" size="sm" className="py-2 px-4" onClick={handleAddFriend} style={{ backgroundColor: "var(--accent-success)", border: "none", borderRadius: "50px" }}>
                            🤝 Add Friend
                        </Button>
                    </Stack>
                )}
            </Card.Body>
        </Card>
    );
};

export default SearchUser;