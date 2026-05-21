import { useContext, useState, useRef, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import { CallContext } from "../context/CallContext";
import { Stack, Form, Button, Dropdown, Badge, Modal } from "react-bootstrap";
import moment from "moment";

const MessageStatusTick = ({ isRead, isDelivered }) => {
    if (isRead) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ff4b4b" viewBox="0 0 16 16" style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }}>
                <path d="M8.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L2.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093L8.95 4.992a.252.252 0 0 1 .02-.022zm-.92 5.14.92.92a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 1 0-1.091-1.028L9.477 9.417l-.485-.486-.543.547z"/>
            </svg>
        );
    }
    if (isDelivered) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="var(--text-secondary)" viewBox="0 0 16 16" style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }}>
                <path d="M8.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L2.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093L8.95 4.992a.252.252 0 0 1 .02-.022zm-.92 5.14.92.92a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 1 0-1.091-1.028L9.477 9.417l-.485-.486-.543.547z"/>
            </svg>
        );
    }
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="var(--text-secondary)" viewBox="0 0 16 16" style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }}>
            <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
        </svg>
    );
};

const ChatBox = () => {
    const { user, toggleBlockUser,  } = useContext(AuthContext);
    const {
        currentChat, messages, isMessagesLoading, sendTextMessage, allUsers, onlineUsers,
        clearMessages, deleteChat, blockedUsersList,
        addMembersToGroup, promoteToSubAdmin, demoteSubAdmin, leaveGroupChat, removeMember, userChats,
        lastReadTimestamps, updateCurrentChat
    } = useContext(ChatContext);
    const { initiateCall, showAlert } = useContext(CallContext);

    const [textMessage, setTextMessage] = useState("");
    const scrollRef = useRef();
    const [attachment, setAttachment] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limit file size to 15MB
        if (file.size > 15 * 1024 * 1024) {
            showAlert("File size exceeds 15MB. Please choose a smaller file.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            let type = "file";
            if (file.type.startsWith("image/")) {
                type = "image";
            } else if (file.type.startsWith("video/")) {
                type = "video";
            }
            setAttachment({
                fileData: reader.result,
                fileType: type,
                fileName: file.name
            });
        };
        reader.readAsDataURL(file);
    };

    const handleSendMessageSubmit = async (e) => {
        e.preventDefault();
        if (!textMessage.trim() && !attachment) return;

        const res = await sendTextMessage(textMessage, user, currentChat._id, setTextMessage, attachment);
        setAttachment(null);
        if (res && res.error) {
            showAlert(res.message || "Failed to send message.");
        }
    };

   // --- MODAL STATE ENGINE ---
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState(""); 
    const [searchAddId, setSearchAddId] = useState("");
    
    //  Holds the user we want to remove so the confirm screen knows who it is
    const [targetMember, setTargetMember] = useState(null);

    const [showGroupCallModal, setShowGroupCallModal] = useState(false);
    const [groupCallType, setGroupCallType] = useState("voice"); // "voice" | "video"


    
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
    
    // 🔥 Group chats are immune to 1-on-1 blocking checks
    const isUserCurrentlyBlocked = !currentChat?.isGroup && user?.blockedUsers?.includes(recipientId);

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

        // SAFE SEARCH: Look through locally loaded users to prevent backend crashes
        const found = allUsers?.find(u => u.userId === searchAddId.trim() || u.email === searchAddId.trim() || u.name === searchAddId.trim());
        
        if (!found) {
            showAlert("User not found in the network. Check the ID.");
            return;
        }
        if (currentChat.members.includes(found._id)) {
            showAlert("User is already in this group.");
            return;
        }

        addMembersToGroup(currentChat._id, [found._id]);
        setSearchAddId("");
        setShowModal(false);
    };

 return (
        <>
            <Stack gap={4} className="chat-container card-material p-3" style={{ height: "75vh", position: "relative" }}>
                {/* --- HEADER --- */}
                <div className="d-flex align-items-center justify-content-between pb-2 pb-sm-3 gap-2 gap-sm-3" style={{ borderBottom: "1px solid var(--accent-border)" }}>
                    <div className="d-flex align-items-center gap-1 gap-sm-3">
                        <Button 
                            variant="link" 
                            className="d-md-none p-0 text-white border-0" 
                            style={{ textDecoration: "none" }}
                            onClick={() => updateCurrentChat(null)}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                        </Button>
                        <div className="d-flex align-items-center gap-2 gap-sm-3">
                            <div className="position-relative">
                                {!currentChat.isGroup && recipient?.profilePic ? (
                                    <img 
                                        src={recipient.profilePic} 
                                        alt="Avatar" 
                                        className="chat-header-avatar"
                                    />
                                ) : (
                                    <div className="chat-header-avatar-placeholder d-flex justify-content-center align-items-center rounded-circle text-white fw-bold" style={{ backgroundColor: currentChat.isGroup ? "var(--accent-secondary)" : "var(--accent-primary)" }}>
                                        {currentChat.isGroup ? currentChat.groupName?.charAt(0).toUpperCase() : recipient?.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                {!currentChat.isGroup && (
                                    <span className="position-absolute bottom-0 end-0 rounded-circle chat-header-online-status" style={{ backgroundColor: isRecipientOnline ? "var(--online-indicator)" : "#64748b", border: "2px solid var(--bg-surface)" }} />
                                )}
                            </div>
                            <div>
                                {/* Line 1: Just the Name and Admin Badges */}
                                <div className="d-flex align-items-center flex-wrap gap-1">
                                    <h5 className="m-0 text-white fw-bold chat-header-title">{currentChat.isGroup ? currentChat.groupName : recipient?.name}</h5>
                                    {currentChat.isGroup && isMainAdmin && <Badge bg="danger" className="chat-header-badge">Admin</Badge>}
                                    {currentChat.isGroup && isSubAdmin && <Badge bg="warning" text="dark" className="chat-header-badge">Sub-Admin</Badge>}
                                </div>

                                {/* Line 2: User ID Pill + Online Status (Non-stacking wrap layout) */}
                                <div className="d-flex align-items-center flex-wrap gap-1 gap-sm-2 mt-1">
                                    
                                    {/* 🔥 SLEEK UI: User ID styled as a modern dark pill */}
                                    {!currentChat.isGroup && recipient?.userId && (
                                        <span className="chat-header-userid">
                                            @{recipient.userId}
                                        </span>
                                    )}

                                    {!currentChat.isGroup ? (
                                        <small style={{ color: isRecipientOnline ? "var(--online-indicator)" : "var(--text-secondary)", fontSize: "0.75rem", fontWeight: "500" }}>
                                            {isRecipientOnline ? "• Online" : "Offline"}
                                        </small>
                                    ) : (
                                        <small style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                                            {currentChat.members.length} Members
                                        </small>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- ACTIONS DRAWER --- */}
                    <div className="d-flex gap-2 align-items-center">
                        {!currentChat.isGroup && (
                            <>
                                <Button 
                                    size="sm" 
                                    className="d-inline-flex btn-responsive-action rounded-pill px-3 py-1 text-nowrap align-items-center gap-1 btn-green-call-outline" 
                                    style={{ fontSize: "0.8rem" }} 
                                    onClick={() => initiateCall(recipient._id, recipient.name, recipient.profilePic, true)}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    <span className="d-none d-md-inline ms-1">Call</span>
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="d-inline-flex btn-responsive-action rounded-pill px-3 py-1 text-nowrap align-items-center gap-1 btn-green-call-outline" 
                                    style={{ fontSize: "0.8rem" }} 
                                    onClick={() => initiateCall(recipient._id, recipient.name, recipient.profilePic, false)}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                    <span className="d-none d-md-inline ms-1">Video</span>
                                </Button>
                                <Dropdown align="end">
                                    <Dropdown.Toggle variant="link" className="dropdown-three-dots p-0 border-0">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="1.5"></circle>
                                            <circle cx="12" cy="5" r="1.5"></circle>
                                            <circle cx="12" cy="19" r="1.5"></circle>
                                        </svg>
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu variant="dark" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--accent-border)", fontSize: "0.85rem" }}>
                                        <Dropdown.Item onClick={() => clearMessages(currentChat._id)}>🧹 Clear Log</Dropdown.Item>
                                        <Dropdown.Item className="text-danger" onClick={() => deleteChat(currentChat._id)}>💔 Unfriend</Dropdown.Item>
                                        <Dropdown.Item className="text-danger" onClick={() => toggleBlockUser(recipientId)}>
                                            {isUserCurrentlyBlocked ? "🔓 Unblock" : "🚫 Block"}
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </>
                        )}

                        {currentChat.isGroup && (
                            <>
                                <Button 
                                    size="sm" 
                                    className="d-inline-flex btn-responsive-action rounded-pill px-3 py-1 text-nowrap align-items-center gap-1 btn-green-call-outline" 
                                    style={{ fontSize: "0.8rem" }} 
                                    onClick={() => {
                                        setGroupCallType("voice");
                                        setShowGroupCallModal(true);
                                    }}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    <span className="d-none d-md-inline ms-1">Call</span>
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="d-inline-flex btn-responsive-action rounded-pill px-3 py-1 text-nowrap align-items-center gap-1 btn-green-call-outline" 
                                    style={{ fontSize: "0.8rem" }} 
                                    onClick={() => {
                                        setGroupCallType("video");
                                        setShowGroupCallModal(true);
                                    }}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                    <span className="d-none d-md-inline ms-1">Video</span>
                                </Button>
                                <Dropdown align="end">
                                    <Dropdown.Toggle variant="link" className="dropdown-three-dots p-0 border-0">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="1.5"></circle>
                                            <circle cx="12" cy="5" r="1.5"></circle>
                                            <circle cx="12" cy="19" r="1.5"></circle>
                                        </svg>
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu variant="dark" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--accent-border)", fontSize: "0.85rem" }}>
                                        <Dropdown.Item onClick={() => clearMessages(currentChat._id)}>🧹 Clear Log</Dropdown.Item>
                                        {(canAddMembers || isMainAdmin || isSubAdmin) && <Dropdown.Divider style={{ borderColor: "var(--accent-border)" }} />}
                                        {canAddMembers && <Dropdown.Item onClick={() => openManageModal("add")}>➕ Add Member</Dropdown.Item>}
                                        {isMainAdmin && (
                                            <>
                                                <Dropdown.Item onClick={() => openManageModal("promote")}>⬆️ Promote to Sub-Admin</Dropdown.Item>
                                                <Dropdown.Item onClick={() => openManageModal("demote")}>⬇️ Demote Sub-Admin</Dropdown.Item>
                                            </>
                                        )}
                                        {(isMainAdmin || isSubAdmin) && (
                                            <Dropdown.Item onClick={() => openManageModal("remove")}>❌ Remove Member</Dropdown.Item>
                                        )}
                                        <Dropdown.Divider style={{ borderColor: "var(--accent-border)" }} />
                                        <Dropdown.Item className="text-danger fw-bold" onClick={() => openManageModal("confirm_leave")}>🚪 Leave Group</Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </>
                        )}
                    </div>
                </div>


                {/* --- MESSAGES LOG --- */}
                <Stack gap={3} className="messages-box px-2" style={{ overflowY: "auto", flexGrow: 1 }}>
                    {messages && messages.map((msg, index) => {
                        const isMyMessage = msg.senderId === user?._id;
                        const isSystem = msg.senderId === "SYSTEM";
                        let isMessageRead = false;
                        let isMessageDelivered = false;

                        if (currentChat.isGroup) {
                            const otherMembers = currentChat.members?.filter(id => id !== user?._id) || [];
                            isMessageRead = otherMembers.length > 0 && otherMembers.every(memberId => {
                                const readTimestamp = lastReadTimestamps[`lastRead_${currentChat._id}_${memberId}`];
                                return readTimestamp && new Date(msg.createdAt) <= new Date(readTimestamp);
                            });
                            isMessageDelivered = false;
                        } else {
                            const readTimestamp = lastReadTimestamps[`lastRead_${currentChat._id}_${recipientId}`];
                            isMessageRead = !!(readTimestamp && new Date(msg.createdAt) <= new Date(readTimestamp));
                            isMessageDelivered = !!isRecipientOnline;
                        }

                        return (
                            <div key={index} ref={scrollRef} className={`d-flex flex-column ${isSystem ? "align-items-center" : isMyMessage ? "align-items-end" : "align-items-start"} my-1`}>
                                {isSystem ? (
                                    <div className="text-center my-2" style={{ fontSize: "0.8rem", color: "#9ca3af", fontStyle: "italic", padding: "5px 12px", backgroundColor: "#3f3f3f50", borderRadius: "10px" }}>
                                        {msg.text}
                                    </div>
                                ) : (
                                    <div className="d-flex align-items-end gap-2" style={{ maxWidth: "75%" }}>
                                        {!isMyMessage && (
                                            <div style={{ width: "32px", height: "32px", flexShrink: 0 }}>
                                                {(() => {
                                                    const senderObj = allUsers?.find(u => u._id === msg.senderId);
                                                    if (senderObj?.profilePic) {
                                                        return (
                                                            <img 
                                                                src={senderObj.profilePic} 
                                                                alt="Avatar" 
                                                                style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} 
                                                            />
                                                        );
                                                    }
                                                    return (
                                                        <div className="d-flex justify-content-center align-items-center rounded-circle text-white fw-bold" style={{ width: "32px", height: "32px", fontSize: "0.75rem", backgroundColor: "var(--accent-secondary)" }}>
                                                            {senderObj?.name?.charAt(0).toUpperCase() || "U"}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                        <div className="px-3 py-2 text-white shadow-sm" style={{ backgroundColor: isMyMessage ? "var(--accent-primary)" : "var(--silt)", borderRadius: isMyMessage ? "20px 20px 4px 20px" : "20px 20px 20px 4px", fontSize: "var(--chat-font-size, 0.95rem)", width: "fit-content", wordBreak: "break-word" }}>
                                            {currentChat.isGroup && !isMyMessage && (
                                                <div style={{ fontSize: "var(--chat-timestamp-size, 0.7rem)", color: "var(--accent-primary)", fontWeight: "bold", marginBottom: "2px" }}>
                                                    {allUsers?.find(u => u._id === msg.senderId)?.name || "User"}
                                                </div>
                                            )}
                                            {msg.fileData && (
                                                <div className="mb-2" style={{ maxWidth: "250px" }}>
                                                    {msg.fileType === "image" && (
                                                        <img 
                                                            src={msg.fileData} 
                                                            alt={msg.fileName || "Image"} 
                                                            style={{ width: "100%", borderRadius: "10px", cursor: "pointer", objectFit: "cover", maxHeight: "200px" }}
                                                            onClick={() => {
                                                                const win = window.open();
                                                                if (win) {
                                                                    win.document.write(`<iframe src="${msg.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                    {msg.fileType === "video" && (
                                                        <video 
                                                            src={msg.fileData} 
                                                            controls 
                                                            style={{ width: "100%", borderRadius: "10px", maxHeight: "200px" }} 
                                                        />
                                                    )}
                                                    {msg.fileType === "file" && (
                                                        <div className="d-flex align-items-center gap-2 p-2 rounded" style={{ backgroundColor: "rgba(0,0,0,0.15)", border: "1px solid var(--accent-border)" }}>
                                                            <span style={{ fontSize: "1.5rem" }}>📄</span>
                                                            <div className="d-flex flex-column overflow-hidden" style={{ minWidth: "120px" }}>
                                                                <span style={{ fontSize: "0.85rem", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", fontWeight: "500", color: "#fff" }}>{msg.fileName}</span>
                                                                <a 
                                                                    href={msg.fileData} 
                                                                    download={msg.fileName} 
                                                                    style={{ fontSize: "0.75rem", color: "var(--text-primary)", textDecoration: "underline" }}
                                                                >
                                                                    Download
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {msg.text && <span>{msg.text}</span>}
                                            <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: "var(--chat-timestamp-size, 0.7rem)", opacity: 0.75, justifyContent: isMyMessage ? "flex-end" : "flex-start" }}>
                                                <span>{moment(msg.createdAt).format("h:mm A")}</span>
                                                {isMyMessage && (
                                                    <MessageStatusTick isRead={isMessageRead} isDelivered={isMessageDelivered} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </Stack>

                {/* --- INPUT FOOTER --- */}
                <Form onSubmit={handleSendMessageSubmit} className="mt-auto">
                    {attachment && (
                        <div className="d-flex align-items-center justify-content-between p-2 mb-2 rounded border" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--accent-border)" }}>
                            <div className="d-flex align-items-center gap-2">
                                {attachment.fileType === "image" && (
                                    <img src={attachment.fileData} alt="Preview" style={{ width: "40px", height: "40px", borderRadius: "5px", objectFit: "cover" }} />
                                )}
                                {attachment.fileType === "video" && (
                                    <div style={{ position: "relative", width: "40px", height: "40px", backgroundColor: "#000", borderRadius: "5px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                                        <span style={{ fontSize: "1rem" }}>🎥</span>
                                    </div>
                                )}
                                {attachment.fileType === "file" && (
                                    <span style={{ fontSize: "1.5rem" }}>📄</span>
                                )}
                                <div className="d-flex flex-column overflow-hidden" style={{ maxWidth: "200px" }}>
                                    <span style={{ fontSize: "0.85rem", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }} className="text-white">{attachment.fileName}</span>
                                    <small style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Ready to send</small>
                                </div>
                            </div>
                            <Button size="sm" variant="outline-danger" className="rounded-circle border-0" onClick={() => setAttachment(null)}>✕</Button>
                        </div>
                    )}
                    <Stack direction="horizontal" gap={2}>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: "none" }} 
                            onChange={handleFileChange}
                            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                        />
                        <Button 
                            type="button"
                            disabled={isUserCurrentlyBlocked} 
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-circle d-flex justify-content-center align-items-center" 
                            style={{ width: "var(--input-btn-size, 44px)", height: "var(--input-btn-size, 44px)", backgroundColor: "transparent", color: "var(--accent-primary)", border: "1px solid var(--accent-border)", flexShrink: 0 }}
                        >
                            📎
                        </Button>
                        <Form.Control
                            type="text"
                            placeholder={isUserCurrentlyBlocked ? "🚫 Unblock this user to resume chatting..." : "Type a message..."}
                            disabled={isUserCurrentlyBlocked}
                            value={textMessage}
                            onChange={(e) => setTextMessage(e.target.value)}
                            style={{ backgroundColor: "var(--bg-main)", color: "var(--text-primary)", borderColor: "var(--accent-border)", borderRadius: "50px", padding: "var(--input-padding, 0.65rem 1.4rem)" }}
                        />
                        <Button type="submit" disabled={isUserCurrentlyBlocked} className="rounded-circle d-flex justify-content-center align-items-center" style={{ width: "var(--input-btn-size, 44px)", height: "var(--input-btn-size, 44px)", backgroundColor: "var(--accent-primary)", border: "none", flexShrink: 0 }}>➔</Button>
                    </Stack>
                </Form>
            </Stack>

            {/* ========================================== */}
            {/* IN-APP GROUP MANAGEMENT MODAL DIALOGS      */}
            {/* ========================================== */}
            <Modal show={showModal} onHide={() => { setShowModal(false); setTargetMember(null); }} centered contentClassName="card-material text-white" style={{ border: "1px solid var(--accent-border)" }}>
                <Modal.Header closeButton closeVariant="white" style={{ borderBottom: "1px solid var(--accent-border)" }}>
                    <Modal.Title className="fs-5">
                        {modalMode === "add" && "➕ Add Member to Group"}
                        {modalMode === "promote" && "⬆️ Promote to Sub-Admin"}
                        {modalMode === "demote" && "⬇️ Demote Sub-Admin"}
                        {modalMode === "remove" && "❌ Remove Member"}
                        {modalMode === "confirm_remove" && "⚠️ Confirm Removal"}
                        {modalMode === "confirm_leave" && "🚪 Confirm Exit"}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>

                    {modalMode === "add" && (
                        <Stack gap={4}>
                            <Form onSubmit={handleSearchAddSubmit}>
                                <Form.Label style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Search by User ID</Form.Label>
                                <Stack direction="horizontal" gap={2}>
                                    <Form.Control type="text" placeholder="user_xyz123..." value={searchAddId} onChange={(e) => setSearchAddId(e.target.value)} style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--accent-border)", borderRadius: "50px" }} />
                                    <Button type="submit" variant="primary" style={{ borderRadius: "50px" }}>Search</Button>
                                </Stack>
                            </Form>
                            <div>
                                <Form.Label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "10px" }}>Or Quick Add Existing Friends:</Form.Label>
                                {activeFriendsNotInGroup.length === 0 ? (
                                    <p className="text-muted text-center" style={{ fontSize: "0.85rem" }}>All active friends are already in this group.</p>
                                ) : (
                                    <Stack gap={2} style={{ maxHeight: "200px", overflowY: "auto" }}>
                                        {activeFriendsNotInGroup.map(friend => (
                                            <div key={friend._id} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ backgroundColor: "var(--bg-main)" }}>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="d-flex justify-content-center align-items-center text-white rounded-circle" style={{ width: "30px", height: "30px", backgroundColor: "var(--accent-primary)", fontWeight: "bold", fontSize: "0.8rem" }}>
                                                        {friend.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    {/* 🔥 NEW: Stacked Name and ID */}
                                                    <div className="d-flex flex-column">
                                                        <span style={{ fontSize: "0.9rem", lineHeight: "1" }}>{friend.name}</span>
                                                        <span style={{ fontSize: "0.75rem", color: "#a3a3a3" }}>@{friend.userId}</span>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="outline-success" className="rounded-pill px-3" style={{ fontSize: "0.75rem" }} onClick={() => { addMembersToGroup(currentChat._id, [friend._id]); setShowModal(false); }}>+ Add</Button>
                                            </div>
                                        ))}
                                    </Stack>
                                )}
                            </div>
                        </Stack>
                    )}

                    {modalMode === "promote" && (
                        <Stack gap={2} style={{ maxHeight: "300px", overflowY: "auto" }}>
                            {groupMemberProfiles.filter(m => m._id !== currentChat.groupAdmin && !currentChat.subAdmins?.includes(m._id)).length === 0 ? (
                                <p className="text-muted text-center py-3">No eligible members to promote.</p>
                            ) : (
                                groupMemberProfiles
                                    .filter(m => m._id !== currentChat.groupAdmin && !currentChat.subAdmins?.includes(m._id))
                                    .map(member => (
                                        <div key={member._id} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ backgroundColor: "var(--bg-main)" }}>
                                            {/* 🔥 NEW: Stacked Name and ID */}
                                            <div className="d-flex flex-column">
                                                <span style={{ fontSize: "0.9rem", lineHeight: "1" }}>{member.name}</span>
                                                <span style={{ fontSize: "0.75rem", color: "#a3a3a3" }}>@{member.userId}</span>
                                            </div>
                                            <Button size="sm" variant="outline-warning" className="rounded-pill px-3" style={{ fontSize: "0.75rem" }} onClick={() => { promoteToSubAdmin(currentChat._id, member._id); setShowModal(false); }}>⬆️ Promote</Button>
                                        </div>
                                    ))
                            )}
                        </Stack>
                    )}

                    {modalMode === "demote" && (
                        <Stack gap={2} style={{ maxHeight: "300px", overflowY: "auto" }}>
                            {!currentChat.subAdmins || currentChat.subAdmins.length === 0 ? (
                                <p className="text-muted text-center py-3">No Sub-Admins assigned in this group.</p>
                            ) : (
                                groupMemberProfiles
                                    .filter(m => currentChat.subAdmins?.includes(m._id))
                                    .map(member => (
                                        <div key={member._id} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ backgroundColor: "var(--bg-main)" }}>
                                            {/* 🔥 NEW: Stacked Name and ID */}
                                            <div className="d-flex flex-column">
                                                <span style={{ fontSize: "0.9rem", lineHeight: "1" }}>{member.name}</span>
                                                <span style={{ fontSize: "0.75rem", color: "#a3a3a3" }}>@{member.userId}</span>
                                            </div>
                                            <Button size="sm" variant="outline-danger" className="rounded-pill px-3" style={{ fontSize: "0.75rem" }} onClick={() => { demoteSubAdmin(currentChat._id, member._id); setShowModal(false); }}>⬇️ Demote</Button>
                                        </div>
                                    ))
                            )}
                        </Stack>
                    )}

                    {modalMode === "remove" && (
                        <Stack gap={2} style={{maxHeight: "300px", overflowY: "auto"}}>
                            {groupMemberProfiles
                                .filter(m => {
                                    if (isMainAdmin) {
                                        return m._id !== currentChat.groupAdmin;
                                    }
                                    if (isSubAdmin) {
                                        return m._id !== currentChat.groupAdmin && 
                                               !currentChat.subAdmins?.includes(m._id) && 
                                               m._id !== user?._id;
                                    }
                                    return false;
                                })
                                .map(member => (
                                    <div key={member._id} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{backgroundColor: "var(--bg-main)"}}>
                                        {/* 🔥 NEW: Stacked Name and ID */}
                                        <div className="d-flex flex-column">
                                            <span style={{ fontSize: "0.9rem", lineHeight: "1" }}>{member.name}</span>
                                            <span style={{ fontSize: "0.75rem", color: "#a3a3a3" }}>@{member.userId}</span>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="outline-danger" 
                                            className="rounded-pill px-3" 
                                            style={{fontSize: "0.75rem"}} 
                                            onClick={() => { 
                                                setTargetMember(member);
                                                setModalMode("confirm_remove");
                                            }}
                                        >
                                            ❌ Remove
                                        </Button>
                                    </div>
                                ))
                            }
                        </Stack>
                    )}

                    {modalMode === "confirm_remove" && targetMember && (
                        <Stack gap={3} className="text-center py-4">
                            <h5 className="text-white">Are you sure you want to remove <span style={{color: "var(--accent-danger)"}}>{targetMember.name}</span>?</h5>
                            <p className="text-muted m-0" style={{fontSize: "0.85rem"}}>They will immediately lose access to this group chat and its history.</p>
                            
                            <Stack direction="horizontal" gap={3} className="justify-content-center mt-3">
                                <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => { setModalMode("remove"); setTargetMember(null); }}>Cancel</Button>
                                <Button variant="danger" className="rounded-pill px-4" onClick={() => {
                                    removeMember(currentChat._id, targetMember._id);
                                    setShowModal(false);
                                    setTargetMember(null);
                                }}>Yes, Remove</Button>
                            </Stack>
                        </Stack>
                    )}

                    {modalMode === "confirm_leave" && (
                        <Stack gap={3} className="text-center py-4">
                            <h5 className="text-white">Are you sure you want to leave <span style={{color: "var(--accent-purple)"}}>{currentChat.groupName}</span>?</h5>
                            <p className="text-muted m-0" style={{fontSize: "0.85rem"}}>You will lose access to all messages, files, and updates in this chat.</p>
                            
                            <Stack direction="horizontal" gap={3} className="justify-content-center mt-3">
                                <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setShowModal(false)}>Cancel</Button>
                                <Button variant="danger" className="rounded-pill px-4" onClick={() => {
                                    leaveGroupChat(currentChat._id);
                                    setShowModal(false);
                                }}>Yes, Leave Group</Button>
                            </Stack>
                        </Stack>
                    )}

                </Modal.Body>
            </Modal>

            {/* ========================================== */}
            {/* GROUP CALL MODAL DIRECT DIAL               */}
            {/* ========================================== */}
            <Modal show={showGroupCallModal} onHide={() => setShowGroupCallModal(false)} centered contentClassName="card-material text-white" style={{ border: "1px solid var(--accent-border)" }}>
                <Modal.Header closeButton closeVariant="white" style={{ borderBottom: "1px solid var(--accent-border)" }}>
                    <Modal.Title className="fs-5">
                        {groupCallType === "voice" ? "📞 Start Voice Call" : "📹 Start Video Call"}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="text-muted mb-3" style={{ fontSize: "0.85rem" }}>
                        Select a member from the group to call:
                    </p>
                    <Stack gap={2} style={{ maxHeight: "300px", overflowY: "auto" }}>
                        {groupMemberProfiles.filter(m => m._id !== user?._id).length === 0 ? (
                            <p className="text-muted text-center py-3">No other members in this group.</p>
                        ) : (
                            groupMemberProfiles
                                .filter(m => m._id !== user?._id)
                                .map(member => {
                                    const isMemberOnline = onlineUsers?.some((u) => u.userId === member._id);
                                    return (
                                        <div key={member._id} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ backgroundColor: "var(--bg-main)" }}>
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="position-relative">
                                                    {member.profilePic ? (
                                                        <img 
                                                            src={member.profilePic} 
                                                            alt="Avatar" 
                                                            style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} 
                                                        />
                                                    ) : (
                                                        <div className="d-flex justify-content-center align-items-center rounded-circle text-white fw-bold" style={{ width: "32px", height: "32px", fontSize: "0.75rem", backgroundColor: "var(--accent-secondary)" }}>
                                                            {member.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="position-absolute bottom-0 end-0 rounded-circle" style={{ width: "8px", height: "8px", backgroundColor: isMemberOnline ? "var(--online-indicator)" : "#64748b", border: "1.5px solid var(--bg-surface)" }} />
                                                </div>
                                                <div className="d-flex flex-column">
                                                    <span style={{ fontSize: "0.9rem", lineHeight: "1.2" }} className="text-white fw-semibold">{member.name}</span>
                                                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>@{member.userId}</span>
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                className="rounded-pill px-3 py-1 btn-green-call-outline d-flex align-items-center gap-1" 
                                                style={{ fontSize: "0.75rem" }} 
                                                onClick={() => {
                                                    initiateCall(member._id, member.name, member.profilePic, groupCallType === "voice");
                                                    setShowGroupCallModal(false);
                                                }}
                                            >
                                                {groupCallType === "voice" ? (
                                                    <>
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                        <span>Call</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                                        <span>Video</span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    );
                                })
                        )}
                    </Stack>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default ChatBox;