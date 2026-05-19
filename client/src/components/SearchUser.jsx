import { useContext, useState } from "react";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/AuthContext";
import { Form, Button, Stack, Alert, Card, Badge } from "react-bootstrap";
import { baseUrl, getRequest } from "../utils/services";

const SearchUser = () => {
    const { user } = useContext(AuthContext);
    const { createChat, userChats, createGroupChat, allUsers } = useContext(ChatContext);
    const [activeMode, setActiveMode] = useState(null);

    // Search States
    const [searchTerm, setSearchTerm] = useState("");
    const [searchedUser, setSearchedUser] = useState(null);
    const [searchError, setSearchError] = useState(null);

    // Group States
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

    // 1-on-1 Search Flow
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        setSearchError(null); setSearchedUser(null);
        const response = await getRequest(`${baseUrl}/users/search/${searchTerm.trim()}`);
        if (response.error) return showTemporaryError("User not found.");
        if (response._id === user._id) return showTemporaryError("You cannot chat with yourself!");
        if (userChats?.some(chat => !chat.isGroup && chat.members.includes(response._id))) return showTemporaryError("Already friends.");
        setSearchedUser(response);
    };

    const handleAddFriend = () => {
        // STRICTLY 1-ON-1
        createChat(user._id, searchedUser._id);
        setSearchedUser(null); setSearchTerm(""); setActiveMode(null); 
    };

    // Group Setup Flow
    const handleAddMemberToPendingGroup = async (e) => {
        if (e) e.preventDefault();
        if (!groupMemberIdInput.trim()) return;
        setSearchError(null);
        const response = await getRequest(`${baseUrl}/users/search/${groupMemberIdInput.trim()}`);
        if (response.error) return showTemporaryError("User not found.");
        if (response._id === user._id) return showTemporaryError("You are the owner!");
        if (groupMembersList.some(m => m._id === response._id)) return showTemporaryError("Already added.");
        setGroupMembersList(prev => [...prev, response]);
        setGroupMemberIdInput("");
    };

    const handleToggleFriendInGroup = (friend) => {
        setSearchError(null);
        const isAdded = groupMembersList.some(m => m._id === friend._id);
        if (isAdded) setGroupMembersList(prev => prev.filter(m => m._id !== friend._id));
        else setGroupMembersList(prev => [...prev, friend]);
    };

    const handleCompileAndCreateGroup = () => {
        if (!groupName.trim()) return showTemporaryError("Declare a group name.");
        // STRICTLY GROUP
        createGroupChat(groupName.trim(), groupMembersList.map(m => m._id));
        setGroupName(""); setGroupMembersList([]); setActiveMode(null); 
    };

    const inputStyle = { backgroundColor: "var(--bg-input)", color: "#ffffff", borderColor: "#2b2b2b", borderRadius: "50px", padding: "0.65rem 1.4rem", fontSize: "0.95rem" };

    return (
        <Card className="shadow-sm mb-3" style={{ backgroundColor: "var(--bg-surface)", borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <Card.Body className="p-3">
                <div className="p-1 rounded-pill" style={{ backgroundColor: "var(--bg-main)", width: "fit-content" }}>
                    <Stack direction="horizontal" gap={1}>
                        <Button size="sm" onClick={() => handleModeToggle("search")} style={{ backgroundColor: activeMode === "search" ? "var(--accent-blue)" : "transparent", color: "#ffffff", border: "none", borderRadius: "50px", padding: "0.5rem 1.4rem", fontWeight: "500" }}>🔍 Search User</Button>
                        <Button size="sm" onClick={() => handleModeToggle("group")} style={{ backgroundColor: activeMode === "group" ? "var(--accent-purple)" : "transparent", color: activeMode === "group" ? "#ffffff" : "var(--text-secondary)", border: "none", borderRadius: "50px", padding: "0.5rem 1.4rem", fontWeight: "500" }}>👥 Create Group</Button>
                    </Stack>
                </div>

                {activeMode === "search" && (
                    <Form onSubmit={handleSearch} className="mt-3 pt-3 border-top" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Stack direction="horizontal" gap={3} style={{ maxWidth: "600px" }}>
                            <Form.Control type="text" placeholder="Enter ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={inputStyle} />
                            <Button type="submit" style={{ borderRadius: "50px", backgroundColor: "var(--accent-blue)", border: "none" }}> Search </Button>
                        </Stack>
                    </Form>
                )}

                {activeMode === "group" && (
                    <div className="mt-3 pt-3 border-top" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Stack gap={3} style={{ maxWidth: "600px" }}>
                            <Form.Control type="text" placeholder="📁 Group name..." value={groupName} onChange={(e) => setGroupName(e.target.value)} style={inputStyle} />
                            <Form onSubmit={handleAddMemberToPendingGroup}>
                                <Stack direction="horizontal" gap={3}>
                                    <Form.Control type="text" placeholder="🔍 Search ID..." value={groupMemberIdInput} onChange={(e) => setGroupMemberIdInput(e.target.value)} style={inputStyle} />
                                    <Button type="submit" variant="outline-secondary" style={{ borderRadius: "50px" }}>➕ Add Member</Button>
                                </Stack>
                            </Form>
                            <div className="px-1 text-start">
                                <small style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Quick Add from active chats:</small>
                                <div className="d-flex flex-wrap gap-2 mt-2">
                                    {activeFriends?.map(friend => {
                                        const isAdded = groupMembersList.some(m => m._id === friend._id);
                                        return (
                                            <div key={friend._id} className="d-flex align-items-center gap-2 p-1 pe-2 rounded-pill" style={{ backgroundColor: isAdded ? "rgba(168, 85, 247, 0.15)" : "#2b2b2b", border: isAdded ? "1px solid var(--accent-purple)" : "1px solid #3f3f3f" }}>
                                                <div className="d-flex justify-content-center align-items-center text-white rounded-circle" style={{ width: "24px", height: "24px", fontSize: "0.75rem", fontWeight: "bold", backgroundColor: "var(--accent-blue)" }}>{friend.name?.charAt(0).toUpperCase()}</div>
                                                <span className="text-white" style={{ fontSize: "0.85rem" }}>{friend.name}</span>
                                                <Button size="sm" variant="link" className={`rounded-pill border-0 ms-1 fw-bold p-0 px-1 text-decoration-none ${isAdded ? "text-danger" : "text-primary"}`} style={{ fontSize: "0.75rem" }} onClick={() => handleToggleFriendInGroup(friend)}>{isAdded ? "✕" : "+ Add"}</Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {groupMembersList.length > 0 && (
                                <div className="d-flex flex-wrap gap-2 p-3" style={{ backgroundColor: "var(--bg-main)", borderRadius: "16px", border: "1px solid #2b2b2b" }}>
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
                {activeMode === "search" && searchedUser && (
                    <Stack direction="horizontal" gap={3} className="mt-3 p-2 align-items-center justify-content-between" style={{ backgroundColor: "var(--bg-main)", borderRadius: "50px", maxWidth: "600px", border: "1px solid #2b2b2b" }}>
                        <div className="d-flex align-items-center gap-2 ps-2">
                            <div className="d-flex justify-content-center align-items-center" style={{ height: "34px", width: "34px", borderRadius: "50%", backgroundColor: "var(--accent-blue)", color: "white", fontWeight: "bold" }}>{searchedUser.name.charAt(0).toUpperCase()}</div>
                            <strong style={{ color: "var(--text-primary)" }}>{searchedUser.name}</strong>
                        </div>
                        <Button variant="success" size="sm" className="py-2 px-4" onClick={handleAddFriend} style={{ borderRadius: "50px" }}>🤝 Add Friend</Button>
                    </Stack>
                )}
            </Card.Body>
        </Card>
    );
};

export default SearchUser;