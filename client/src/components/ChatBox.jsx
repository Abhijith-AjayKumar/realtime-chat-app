import { useContext, useState, useRef, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import { Stack, Form, Button, Dropdown, Badge, Modal } from "react-bootstrap";
import moment from "moment";

const ChatBox = () => {
    const { user } = useContext(AuthContext);
    const { 
        currentChat, messages, isMessagesLoading, sendTextMessage, allUsers, onlineUsers, 
        clearMessages, deleteChat, blockedUsersList, toggleBlockState,
        addMembersToGroup, promoteToSubAdmin, demoteSubAdmin, leaveGroupChat, userChats
    } = useContext(ChatContext);
    
    const [textMessage, setTextMessage] = useState("");
    const scrollRef = useRef();

    // --- MODAL STATE ENGINE ---
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState(""); // "add", "promote", "demote"
    const [searchAddId, setSearchAddId] = useState("");

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    if (!currentChat) {
        return (
            <div className="w-100 d-flex justify-content-center align-items-center card-material text-muted text-center" style={{ height: "65vh" }}>
                <div><h3 className="fs-1 mb-2">💬</h3><p>No conversation selected yet...</p></div>
            </div>
        );
    }

    if (isMessagesLoading) return <p className="text-center text-white my-5">Loading deep data logs...</p>;

    // 1-on-1 DM Variables
    const recipientId = currentChat?.members?.find((id) => id !== user?._id);
    const recipient = allUsers?.find((u) => u._id === recipientId);
    const isRecipientOnline = onlineUsers?.some((u) => u.userId === recipientId);
    const isUserCurrentlyBlocked = blockedUsersList?.includes(recipientId);

    // --- GROUP ADMIN PERMISSION VARIABLES ---
    const isMainAdmin = currentChat?.groupAdmin === user?._id;
    const isSubAdmin = currentChat?.subAdmins?.includes(user?._id);
    const canAddMembers = isMainAdmin || isSubAdmin;

    // --- MODAL DATA RESOLVERS ---
    const openManageModal = (mode) => {
        setModalMode(mode);
        setSearchAddId("");
        setShowModal(true);
    };

    // Resolve full profiles for everyone currently inside this group
    const groupMemberProfiles = currentChat?.isGroup ? allUsers?.filter(u => currentChat.members.includes(u._id)) : [];
    
    // Resolve active 1-on-1 friends who are NOT currently in this group
    const activeFriendsNotInGroup = userChats?.filter(c => !c.isGroup).map(c => {
        const friendId = c.members.find(id => id !== user?._id);
        return allUsers?.find(u => u._id === friendId);
    }).filter(f => f && !currentChat?.members?.includes(f._id));

    // Handle manual ID search for adding to group
    const handleSearchAddSubmit = (e) => {
        e.preventDefault();
        if (!searchAddId.trim()) return;
        
        const found = allUsers?.find(u => u.userId === searchAddId.trim() || u.email === searchAddId.trim());
        if (!found) return alert("User not found in the network. Check the ID.");
        if (currentChat.members.includes(found._id)) return alert("User is already in this group.");
        
        addMembersToGroup(currentChat._id, [found._id]);
        setSearchAddId("");
        setShowModal(false);
    };

    return (
        <>
            <Stack gap={4} className="chat-container card-material p-3" style={{ height: "75vh", position: "relative" }}>
                {/* --- HEADER --- */}
                <div className="d-flex align-items-center justify-content-between pb-3 border-bottom border-secondary">
                    <div className="d-flex align-items-center gap-3">
                        <div className="position-relative">
                            <div className="d-flex justify-content-center align-items-center rounded-circle text-white fw-bold" style={{ width: "40px", height: "40px", backgroundColor: currentChat.isGroup ? "var(--accent-purple)" : "var(--accent-blue)" }}>
                                {currentChat.isGroup ? currentChat.groupName?.charAt(0).toUpperCase() : recipient?.name?.charAt(0).toUpperCase()}
                            </div>
                            {!currentChat.isGroup && (
                                <span className="position-absolute bottom-0 end-0 rounded-circle" style={{ width: "10px", height: "10px", backgroundColor: isRecipientOnline ? "#22c55e" : "#64748b", border: "2px solid var(--bg-surface)" }} />
                            )}
                        </div>
                        <div>
                            <div className="d-flex align-items-center">
                                <h5 className="m-0 text-white fw-bold">{currentChat.isGroup ? currentChat.groupName : recipient?.name}</h5>
                                {currentChat.isGroup && isMainAdmin && <Badge bg="danger" className="ms-2" style={{fontSize: "0.65rem", padding: "0.25em 0.6em"}}>Admin</Badge>}
                                {currentChat.isGroup && isSubAdmin && <Badge bg="warning" text="dark" className="ms-2" style={{fontSize: "0.65rem", padding: "0.25em 0.6em"}}>Sub-Admin</Badge>}
                            </div>
                            
                            {!currentChat.isGroup ? (
                                <small style={{ color: isRecipientOnline ? "#22c55e" : "var(--text-secondary)", fontSize: "0.8rem", fontWeight: "500" }}>
                                    {isRecipientOnline ? "• Active Now" : "Offline"}
                                </small>
                            ) : (
                                <small style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                                    {currentChat.members.length} Members
                                </small>
                            )}
                        </div>
                    </div>

                    {/* --- ACTIONS DRAWER --- */}
                    <div className="d-flex gap-2 align-items-center">
                        <Button size="sm" variant="outline-warning" className="rounded-pill px-3 py-1" style={{ fontSize: "0.8rem" }} onClick={() => clearMessages(currentChat._id)}>Clear Log</Button>
                        
                        {!currentChat.isGroup && (
                            <>
                                <Button size="sm" variant="outline-danger" className="rounded-pill px-3 py-1" style={{ fontSize: "0.8rem" }} onClick={() => deleteChat(currentChat._id)}>Unfriend</Button>
                                <Button size="sm" variant={isUserCurrentlyBlocked ? "danger" : "outline-danger"} className="rounded-pill px-3 py-1" style={{ fontSize: "0.8rem", backgroundColor: isUserCurrentlyBlocked ? "#ef4444" : "transparent", color: "#ffffff" }} onClick={() => toggleBlockState(user._id, recipientId)}>
                                    {isUserCurrentlyBlocked ? "Unblock" : "Block"}
                                </Button>
                            </>
                        )}

                        {currentChat.isGroup && (
                            <Dropdown align="end">
                                <Dropdown.Toggle size="sm" className="rounded-pill px-3 py-1" style={{ fontSize: "0.8rem", backgroundColor: "transparent", color: "#c084fc", borderColor: "#c084fc" }}>
                                    ⚙️ Manage Group
                                </Dropdown.Toggle>
                                <Dropdown.Menu variant="dark" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid #3f3f3f", fontSize: "0.85rem" }}>
                                    {canAddMembers && <Dropdown.Item onClick={() => openManageModal("add")}>➕ Add Member</Dropdown.Item>}
                                    {isMainAdmin && (
                                        <>
                                            <Dropdown.Item onClick={() => openManageModal("promote")}>⬆️ Promote to Sub-Admin</Dropdown.Item>
                                            <Dropdown.Item onClick={() => openManageModal("demote")}>⬇️ Demote Sub-Admin</Dropdown.Item>
                                        </>
                                    )}
                                    {(isMainAdmin || isSubAdmin) && <Dropdown.Divider style={{ borderColor: "#3f3f3f" }} />}
                                    <Dropdown.Item className="text-danger fw-bold" onClick={() => { if(window.confirm("Are you sure you want to leave this group?")) leaveGroupChat(currentChat._id); }}>🚪 Leave Group</Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        )}
                    </div>
                </div>

                {/* --- MESSAGES LOG --- */}
                <Stack gap={3} className="messages-box px-2" style={{ overflowY: "auto", flexGrow: 1 }}>
                    {messages && messages.map((msg, index) => {
                        const isMyMessage = msg.senderId === user?._id;
                        return (
                            <div key={index} ref={scrollRef} className={`d-flex flex-column ${isMyMessage ? "align-items-end" : "align-items-start"}`}>
                                <div className="px-3 py-2 text-white shadow-sm" style={{ backgroundColor: isMyMessage ? "var(--accent-blue, #0d6efd)" : "#262626", borderRadius: isMyMessage ? "20px 20px 4px 20px" : "20px 20px 20px 4px", fontSize: "0.95rem", maxWidth: "75%", width: "fit-content" }}>
                                    {/* Small sender name above message for group chats */}
                                    {currentChat.isGroup && !isMyMessage && (
                                        <div style={{fontSize: "0.7rem", color: "var(--accent-blue)", fontWeight: "bold", marginBottom: "2px"}}>
                                            {allUsers?.find(u => u._id === msg.senderId)?.name || "User"}
                                        </div>
                                    )}
                                    <span>{msg.text}</span>
                                    <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: "0.7rem", opacity: 0.75, justifyContent: isMyMessage ? "flex-end" : "flex-start" }}>
                                        <span>{moment(msg.createdAt).format("h:mm A")}</span>
                                        {isMyMessage && <span style={{ color: isRecipientOnline ? "#60a5fa" : "#94a3b8", fontSize: "0.85rem", marginLeft: "2px" }}>{isRecipientOnline ? "✓✓" : "✓"}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </Stack>

                {/* --- INPUT FOOTER --- */}
                <Form onSubmit={(e) => { e.preventDefault(); sendTextMessage(textMessage, user, currentChat._id, setTextMessage); }} className="mt-auto">
                    <Stack direction="horizontal" gap={2}>
                        <Form.Control
                            type="text"
                            placeholder={isUserCurrentlyBlocked ? "🚫 Unblock this user to resume chatting..." : "Type a message..."}
                            disabled={isUserCurrentlyBlocked}
                            value={textMessage}
                            onChange={(e) => setTextMessage(e.target.value)}
                            style={{ backgroundColor: "var(--bg-main)", color: "#ffffff", borderColor: "#2b2b2b", borderRadius: "50px", padding: "0.65rem 1.4rem" }}
                        />
                        <Button type="submit" disabled={isUserCurrentlyBlocked} className="rounded-circle d-flex justify-content-center align-items-center" style={{ width: "44px", height: "44px", backgroundColor: "var(--accent-blue)", border: "none" }}>➔</Button>
                    </Stack>
                </Form>
            </Stack>

            {/* ========================================== */}
            {/* IN-APP GROUP MANAGEMENT MODAL DIALOGS      */}
            {/* ========================================== */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered contentClassName="card-material text-white" style={{ border: "1px solid #3f3f3f" }}>
                <Modal.Header closeButton closeVariant="white" style={{ borderBottom: "1px solid #3f3f3f" }}>
                    <Modal.Title className="fs-5">
                        {modalMode === "add" && "➕ Add Member to Group"}
                        {modalMode === "promote" && "⬆️ Promote to Sub-Admin"}
                        {modalMode === "demote" && "⬇️ Demote Sub-Admin"}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    
                    {/* MODE: ADD MEMBERS */}
                    {modalMode === "add" && (
                        <Stack gap={4}>
                            <Form onSubmit={handleSearchAddSubmit}>
                                <Form.Label style={{fontSize: "0.85rem", color: "var(--text-secondary)"}}>Search by User ID</Form.Label>
                                <Stack direction="horizontal" gap={2}>
                                    <Form.Control type="text" placeholder="user_xyz123..." value={searchAddId} onChange={(e) => setSearchAddId(e.target.value)} style={{ backgroundColor: "var(--bg-input)", color: "#fff", borderColor: "#2b2b2b", borderRadius: "50px" }} />
                                    <Button type="submit" variant="primary" style={{borderRadius: "50px"}}>Search</Button>
                                </Stack>
                            </Form>
                            
                            <div>
                                <Form.Label style={{fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "10px"}}>Or Quick Add Existing Friends:</Form.Label>
                                {activeFriendsNotInGroup.length === 0 ? (
                                    <p className="text-muted text-center" style={{fontSize: "0.85rem"}}>All active friends are already in this group.</p>
                                ) : (
                                    <Stack gap={2} style={{maxHeight: "200px", overflowY: "auto"}}>
                                        {activeFriendsNotInGroup.map(friend => (
                                            <div key={friend._id} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{backgroundColor: "#262626"}}>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="d-flex justify-content-center align-items-center text-white rounded-circle" style={{ width: "30px", height: "30px", backgroundColor: "var(--accent-blue)", fontWeight: "bold", fontSize: "0.8rem" }}>{friend.name?.charAt(0).toUpperCase()}</div>
                                                    <span style={{fontSize: "0.9rem"}}>{friend.name}</span>
                                                </div>
                                                <Button size="sm" variant="outline-success" className="rounded-pill px-3" style={{fontSize: "0.75rem"}} onClick={() => { addMembersToGroup(currentChat._id, [friend._id]); setShowModal(false); }}>+ Add</Button>
                                            </div>
                                        ))}
                                    </Stack>
                                )}
                            </div>
                        </Stack>
                    )}

                    {/* MODE: PROMOTE MEMBERS */}
                    {modalMode === "promote" && (
                        <Stack gap={2} style={{maxHeight: "300px", overflowY: "auto"}}>
                            {groupMemberProfiles.filter(m => m._id !== currentChat.groupAdmin && !currentChat.subAdmins?.includes(m._id)).length === 0 ? (
                                <p className="text-muted text-center py-3">No eligible members to promote.</p>
                            ) : (
                                groupMemberProfiles
                                    .filter(m => m._id !== currentChat.groupAdmin && !currentChat.subAdmins?.includes(m._id))
                                    .map(member => (
                                        <div key={member._id} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{backgroundColor: "#262626"}}>
                                            <span style={{fontSize: "0.9rem"}}>{member.name}</span>
                                            <Button size="sm" variant="outline-warning" className="rounded-pill px-3" style={{fontSize: "0.75rem"}} onClick={() => { promoteToSubAdmin(currentChat._id, member._id); setShowModal(false); }}>⬆️ Promote</Button>
                                        </div>
                                    ))
                            )}
                        </Stack>
                    )}

                    {/* MODE: DEMOTE MEMBERS */}
                    {modalMode === "demote" && (
                        <Stack gap={2} style={{maxHeight: "300px", overflowY: "auto"}}>
                            {!currentChat.subAdmins || currentChat.subAdmins.length === 0 ? (
                                <p className="text-muted text-center py-3">No Sub-Admins assigned in this group.</p>
                            ) : (
                                groupMemberProfiles
                                    .filter(m => currentChat.subAdmins?.includes(m._id))
                                    .map(member => (
                                        <div key={member._id} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{backgroundColor: "#262626"}}>
                                            <span style={{fontSize: "0.9rem"}}>{member.name}</span>
                                            <Button size="sm" variant="outline-danger" className="rounded-pill px-3" style={{fontSize: "0.75rem"}} onClick={() => { demoteSubAdmin(currentChat._id, member._id); setShowModal(false); }}>⬇️ Demote</Button>
                                        </div>
                                    ))
                            )}
                        </Stack>
                    )}

                </Modal.Body>
            </Modal>
        </>
    );
};

export default ChatBox;