import { useContext, useState } from "react";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/AuthContext";
import { Form, Button, Stack, Alert, Card, Badge } from "react-bootstrap";
import { baseUrl, getRequest } from "../utils/services";

const SearchUser = () => {
    const { user, toggleBlockUser, blockedUsersList } = useContext(AuthContext);
    const { createChat, userChats, createGroupChat, allUsers } = useContext(ChatContext);
    const [activeMode, setActiveMode] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [searchedUser, setSearchedUser] = useState(null);
    const [searchError, setSearchError] = useState(null);

    const [groupName, setGroupName] = useState("");
    const [groupMemberIdInput, setGroupMemberIdInput] = useState("");
    const [groupMembersList, setGroupMembersList] = useState([]); 

    const activeFriends = userChats?.filter(chat => !chat.isGroup).map(chat => {
        const friendId = chat.members.find(id => id !== user?._id);
        return allUsers?.find(u => u._id === friendId);
    }).filter(Boolean);

    const showTemporaryError = (errorMessage) => {
        setSearchError(errorMessage);
        setTimeout(() => setSearchError(null), 3000);
    };

    const handleModeToggle = (mode) => {
        setSearchError(null); setSearchedUser(null); setSearchTerm(""); setGroupMemberIdInput("");
        setActiveMode(activeMode === mode ? null : mode);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        setSearchError(null); setSearchedUser(null);
        const response = await getRequest(`${baseUrl}/users/search/${searchTerm.trim()}?currentUserId=${user._id}`);
        if (response.error) return showTemporaryError("User not found or unavailable.");
        if (response._id === user._id) return showTemporaryError("You cannot chat with yourself!");
        if (userChats?.some(chat => !chat.isGroup && chat.members.includes(response._id))) return showTemporaryError("Already friends.");
        setSearchedUser(response);
    };

    const handleAddFriend = () => {
        createChat(user._id, searchedUser._id);
        setSearchedUser(null); setSearchTerm(""); setActiveMode(null); 
    };

    const handleAddMemberToPendingGroup = async (e) => {
        if (e) e.preventDefault();
        if (!groupMemberIdInput.trim()) return;
        setSearchError(null);
        const response = await getRequest(`${baseUrl}/users/search/${groupMemberIdInput.trim()}?currentUserId=${user._id}`);
        if (response.error) return showTemporaryError("User not found.");
        if (response._id === user._id) return showTemporaryError("You are the owner!");
        if (groupMembersList.some(m => m._id === response._id)) return showTemporaryError("Already added.");
        setGroupMembersList(prev => [...prev, response]);
        setGroupMemberIdInput("");
    };

    const handleToggleFriendInGroup = (friend) => {
        const isAdded = groupMembersList.some(m => m._id === friend._id);
        if (isAdded) setGroupMembersList(prev => prev.filter(m => m._id !== friend._id));
        else setGroupMembersList(prev => [...prev, friend]);
    };

    const handleCompileAndCreateGroup = () => {
        if (!groupName.trim()) return showTemporaryError("Declare a group name.");
        createGroupChat(groupName.trim(), groupMembersList.map(m => m._id));
        setGroupName(""); setGroupMembersList([]); setActiveMode(null); 
    };

    const inputStyle = { backgroundColor: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--accent-border)", borderRadius: "50px", padding: "0.65rem 1.4rem", fontSize: "0.95rem" };

    return (
        <Card className="shadow-sm mb-3" style={{ backgroundColor: "var(--bg-surface)", borderRadius: "20px", border: "1px solid var(--accent-border)", boxShadow: "0 4px 12px rgba(16, 6, 3, 0.6)" }}>
            <Card.Body className="p-3">
                <div className="p-1 rounded-pill" style={{ backgroundColor: "var(--bg-main)", width: "fit-content" }}>
                    <Stack direction="horizontal" gap={1}>
                        <Button 
                            size="sm" 
                            onClick={() => handleModeToggle("search")} 
                            className="search-user-tab-btn"
                            style={{ 
                                backgroundColor: activeMode === "search" ? "rgba(255, 255, 255, 0.15)" : "transparent", 
                                color: "#ffffff" 
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ color: "#d1d5db" }}>
                                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                            </svg>
                            Search User
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={() => handleModeToggle("group")} 
                            className="search-user-tab-btn"
                            style={{ 
                                backgroundColor: activeMode === "group" ? "var(--accent-secondary)" : "transparent", 
                                color: activeMode === "group" ? "#ffffff" : "var(--text-secondary)" 
                            }}
                        >
                            👥 Create Group
                        </Button>
                    </Stack>
                </div>

                {activeMode === "search" && (
                    <Form onSubmit={handleSearch} className="mt-3 pt-3 border-top" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Stack direction="horizontal" className="gap-2 gap-sm-3" style={{ maxWidth: "600px" }}>
                            <div className="position-relative d-flex align-items-center flex-grow-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ color: "#a3a3a3", position: "absolute", left: "16px" }}>
                                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                                </svg>
                                <Form.Control type="text" placeholder="Enter ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-control" style={{ ...inputStyle, padding: "0.65rem 1.4rem 0.65rem 2.8rem", width: "100%" }} />
                            </div>
                            <Button type="submit" style={{ borderRadius: "50px", backgroundColor: "var(--accent-primary)", border: "none" }} className="px-3 px-sm-4 py-1.5 py-sm-2 search-btn"> Search </Button>
                        </Stack>
                    </Form>
                )}

                {/* --- SEARCH RESULT DISPLAY --- */}
                {activeMode === "search" && searchedUser && (
                    <Stack direction="horizontal" className="gap-2 gap-sm-3 mt-3 p-2 align-items-center justify-content-between search-result-stack" style={{ backgroundColor: "var(--bg-main)", borderRadius: "50px", maxWidth: "600px", border: "1px solid var(--accent-border)" }}>
                        <div className="d-flex align-items-center gap-2 ps-2">
                            <div className="d-flex justify-content-center align-items-center" style={{ height: "34px", width: "34px", borderRadius: "50%", backgroundColor: "var(--accent-primary)", color: "white", fontWeight: "bold" }}>{searchedUser.name.charAt(0).toUpperCase()}</div>
                            <div className="d-flex flex-column">
                                <strong style={{ color: "var(--text-primary)", fontSize: "0.9rem", lineHeight: "1.1" }}>{searchedUser.name}</strong>
                                <span style={{ color: "#a3a3a3", fontSize: "0.75rem" }}>@{searchedUser.userId}</span>
                            </div>
                        </div>
                        <div className="d-flex gap-1 gap-sm-2">
                            <Button variant="success" size="sm" className="py-1 px-2.5 py-sm-2 px-sm-3 search-action-btn" onClick={handleAddFriend} style={{ borderRadius: "50px" }}>🤝 Add</Button>
                            <Button variant={blockedUsersList.includes(searchedUser._id) ? "danger" : "outline-danger"} size="sm" className="py-1 px-2.5 py-sm-2 px-sm-3 search-action-btn" onClick={() => toggleBlockUser(searchedUser._id)} style={{ borderRadius: "50px" }}>
                                {blockedUsersList.includes(searchedUser._id) ? "Unblock" : "Block"}
                            </Button>
                        </div>
                    </Stack>
                )}

                {/* --- GROUP CREATION DISPLAY --- */}
                {activeMode === "group" && (
                    <div className="mt-3 pt-3 border-top" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Stack gap={3} style={{ maxWidth: "600px" }}>
                            <Form.Control type="text" placeholder="📁 Group name..." value={groupName} onChange={(e) => setGroupName(e.target.value)} style={inputStyle} />
                            <Form onSubmit={handleAddMemberToPendingGroup}>
                                <Stack direction="horizontal" className="gap-2 gap-sm-3">
                                    <div className="position-relative d-flex align-items-center flex-grow-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ color: "#a3a3a3", position: "absolute", left: "16px" }}>
                                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                                        </svg>
                                        <Form.Control type="text" placeholder="Search ID..." value={groupMemberIdInput} onChange={(e) => setGroupMemberIdInput(e.target.value)} className="search-control" style={{ ...inputStyle, padding: "0.65rem 1.4rem 0.65rem 2.8rem", width: "100%" }} />
                                    </div>
                                    <Button type="submit" variant="outline-secondary" style={{ borderRadius: "50px" }} className="px-2.5 px-sm-3 py-1.5 py-sm-2 text-nowrap add-member-btn">
                                        ➕ <span className="d-none d-sm-inline">Add Member</span><span className="d-inline d-sm-none">Add</span>
                                    </Button>
                                </Stack>
                            </Form>
                            
                            {/* 🔥 RESTORED: Quick Add List */}
                            <div className="px-1 text-start">
                                <small style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Quick Add from active chats:</small>
                                <div className="d-flex flex-wrap gap-2 mt-2">
                                    {activeFriends?.map(friend => {
                                        const isAdded = groupMembersList.some(m => m._id === friend._id);
                                        return (
                                            <div key={friend._id} className="d-flex align-items-center gap-2 p-1 pe-2 rounded-pill" style={{ backgroundColor: isAdded ? "rgba(126, 104, 86, 0.15)" : "var(--bg-main)", border: isAdded ? "1px solid var(--accent-secondary)" : "1px solid var(--accent-border)" }}>
                                                <div className="d-flex justify-content-center align-items-center text-white rounded-circle" style={{ width: "24px", height: "24px", fontSize: "0.75rem", fontWeight: "bold", backgroundColor: "var(--accent-primary)" }}>{friend.name?.charAt(0).toUpperCase()}</div>
                                                <span className="text-white" style={{ fontSize: "0.85rem" }}>{friend.name}</span>
                                                <Button size="sm" variant="link" className={`rounded-pill border-0 ms-1 fw-bold p-0 px-1 text-decoration-none ${isAdded ? "text-danger" : "text-primary"}`} style={{ fontSize: "0.75rem" }} onClick={() => handleToggleFriendInGroup(friend)}>{isAdded ? "✕" : "+ Add"}</Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 🔥 RESTORED: Added Members List */}
                            {groupMembersList.length > 0 && (
                                <div className="d-flex flex-wrap gap-2 p-3" style={{ backgroundColor: "var(--bg-main)", borderRadius: "16px", border: "1px solid var(--accent-border)" }}>
                                    {groupMembersList.map(m => (
                                        <Badge key={m._id} bg="secondary" className="p-2 d-flex align-items-center gap-2 rounded-pill" style={{ backgroundColor: "var(--bg-card-active)" }}>
                                            👤 {m.name} <span style={{ cursor: "pointer", color: "var(--accent-danger)", fontWeight: "bold", fontSize: "1rem", marginLeft: "4px" }} onClick={() => setGroupMembersList(prev => prev.filter(user => user._id !== m._id))}>&times;</span>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            <Button onClick={handleCompileAndCreateGroup} disabled={groupMembersList.length === 0} style={{ backgroundColor: "var(--accent-purple)", border: "none", borderRadius: "50px" }}>🚀 Launch Group Chat Room</Button>
                        </Stack>
                    </div>
                )}

                {searchError && <Alert variant="danger" className="mt-3 p-2 mb-0" style={{ maxWidth: "600px", borderRadius: "12px" }}>⚠️ {searchError}</Alert>}
            </Card.Body>
        </Card>
    );
};

export default SearchUser;