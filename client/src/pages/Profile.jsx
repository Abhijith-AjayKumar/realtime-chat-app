import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext"; 
import { Form, Button, Stack, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom"; 

const Profile = () => {
    // 1. Pull in all the Auth profile logic AND the new ID update logic
    const { 
        user, updateProfile, profileError, profileSuccess, isProfileLoading, logoutUser,
        updateSearchId, idUpdateError, idUpdateSuccess, isIdUpdating ,unblockMultiple// <-- New ID props
    } = useContext(AuthContext);
    
    // 2. Chat Context for blocked list
    const { allUsers, blockedUsersList, } = useContext(ChatContext);
    const navigate = useNavigate(); 

    // --- Form State for General Profile ---
    const [formData, setFormData] = useState({
        _id: user?._id,
        currentPassword: "",
        newName: user?.name || "",
        newPassword: "",
        profilePic: user?.profilePic || ""
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                newName: user.name || "",
                profilePic: user.profilePic || ""
            }));
            setNewIdInput(user.userId || "");
        }
    }, [user]);

    // --- State for the Inline Search ID Editor ---
    const [isEditingId, setIsEditingId] = useState(false);
    const [newIdInput, setNewIdInput] = useState(user?.userId || "");

    const [selectedBlocks, setSelectedBlocks] = useState([]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("File size must be under 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profilePic: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhoto = () => {
        setFormData(prev => ({ ...prev, profilePic: "" }));
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        updateProfile(formData);
        setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "" }));
    };

    // --- Search ID Save Handler ---
    const handleSaveId = async () => {
        if (newIdInput.trim() === user?.userId) {
            setIsEditingId(false); // Close if they didn't change anything
            return;
        }

        const success = await updateSearchId(newIdInput.trim());
        if (success) {
            setIsEditingId(false); // Close editor on success
        }
    };

    const handleBlockSelect = (userId) => {
        setSelectedBlocks(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleUnblockSubmit = () => {
        unblockMultiple(selectedBlocks);
        setSelectedBlocks([]); 
    };

    const inputStyle = { backgroundColor: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--accent-border)" };

    if (!user) return null;

    const blockedUserDetails = allUsers?.filter(u => blockedUsersList?.includes(u._id)) || [];

    return (
        <Stack gap={4} className="chat-box" style={{ backgroundColor: "var(--bg-surface)", borderRadius: "10px", padding: "20px", width: "100%", minHeight: "75vh", maxHeight: "75vh", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "0 4px 12px rgba(16, 6, 3, 0.6)" }}>
            
            {/* HEADER */}
            <div className="chat-header d-flex justify-content-between align-items-center" style={{ borderBottom: "1px solid var(--accent-border)", paddingBottom: "10px" }}>
                <div className="d-flex align-items-center gap-3">
                    <Button variant="outline-secondary" size="sm" onClick={() => navigate("/")} style={{ border: "none" }}>
                        &larr; Back
                    </Button>
                    <strong style={{ color: "var(--text-primary)", fontSize: "1.2rem" }}>Profile Settings</strong>
                </div>
                <Button variant="danger" size="sm" onClick={logoutUser}>Logout</Button>
            </div>

            {profileError && <Alert variant="danger">{profileError}</Alert>}
            {profileSuccess && <Alert variant="success">{profileSuccess}</Alert>}

            {/* PROFILE PICTURE COMPONENT */}
            <div className="d-flex align-items-center gap-4 p-3 rounded-3" style={{ backgroundColor: "var(--bg-main)", border: "1px solid var(--accent-border)" }}>
                <div style={{ position: "relative", width: "80px", height: "80px" }}>
                    {formData.profilePic ? (
                        <img 
                            src={formData.profilePic} 
                            alt="Avatar" 
                            style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent-primary)", boxShadow: "0 0 10px rgba(126, 104, 86, 0.4)" }} 
                        />
                    ) : (
                        <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "var(--accent-primary)", display: "flex", justifyContent: "center", alignItems: "center", color: "var(--text-primary)", fontWeight: "bold", fontSize: "2rem", border: "2px solid var(--accent-primary)" }}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <Stack gap={2}>
                    <strong style={{ color: "var(--text-primary)", fontSize: "1.1rem" }}>Profile Picture</strong>
                    <div className="d-flex gap-2">
                        <label className="btn btn-outline-light btn-sm rounded-pill px-3 m-0" style={{ cursor: "pointer" }}>
                            Upload Image
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleFileChange} 
                                style={{ display: "none" }} 
                            />
                        </label>
                        {formData.profilePic && (
                            <Button variant="outline-danger" size="sm" className="rounded-pill px-3" onClick={handleRemovePhoto}>
                                Remove
                            </Button>
                        )}
                    </div>
                    <small style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                        JPG, PNG or GIF. Max 2MB. (Requires password verification below to save)
                    </small>
                </Stack>
            </div>

            {/* INSTAGRAM-STYLE SEARCH ID COMPONENT */}
            <Form.Group>
                <Form.Label style={{ color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase", fontSize: "0.85rem" }}>
                    Your Unique Search ID
                </Form.Label>
                <div className="p-3 rounded-3" style={{ backgroundColor: "var(--bg-main)", border: "1px solid var(--accent-border)" }}>
                    <div className="d-flex align-items-center justify-content-between">
                        {!isEditingId ? (
                            <>
                                <div className="d-flex align-items-center gap-2">
                                    <span style={{ color: "var(--accent-primary)", fontWeight: "bold", fontSize: "1.1rem" }}>@</span>
                                    <span className="text-white fs-5">{user?.userId || "Not set"}</span>
                                </div>
                                <Button 
                                    variant="outline-light" 
                                    size="sm" 
                                    className="rounded-pill px-3"
                                    onClick={() => {
                                        setNewIdInput(user?.userId || "");
                                        setIsEditingId(true);
                                    }}
                                >
                                    Edit
                                </Button>
                            </>
                        ) : (
                            <div className="w-100">
                                <Stack direction="horizontal" gap={2}>
                                    <div className="position-relative flex-grow-1">
                                        <span className="position-absolute top-50 translate-middle-y" style={{ left: "12px", color: "var(--accent-primary)", fontWeight: "bold" }}>@</span>
                                        <Form.Control
                                            type="text"
                                            value={newIdInput}
                                            onChange={(e) => setNewIdInput(e.target.value)}
                                            disabled={isIdUpdating}
                                            style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--accent-border)", paddingLeft: "30px" }}
                                        />
                                    </div>
                                    <Button 
                                        variant="success" 
                                        onClick={handleSaveId}
                                        disabled={isIdUpdating || !newIdInput.trim()}
                                    >
                                        {isIdUpdating ? "..." : "Save"}
                                    </Button>
                                    <Button 
                                        variant="outline-secondary" 
                                        onClick={() => setIsEditingId(false)}
                                        disabled={isIdUpdating}
                                    >
                                        Cancel
                                    </Button>
                                </Stack>
                                    <small style={{ color: "#a3a3a3", display: "block", marginTop: "8px", fontSize: "0.8rem" }}>
                                        Must be unique. Used by friends to invite you to groups.
                                    </small>
                            </div>
                        )}
                    </div>
                    {/* Inline Alerts strictly for the ID updater */}
                    {idUpdateError && <Alert variant="danger" className="mt-3 py-2 px-3 m-0" style={{ fontSize: "0.85rem" }}>{idUpdateError}</Alert>}
                    {idUpdateSuccess && <Alert variant="success" className="mt-3 py-2 px-3 m-0" style={{ fontSize: "0.85rem" }}>{idUpdateSuccess}</Alert>}
                </div>
            </Form.Group>

            {/* STANDARD PROFILE FORM */}
            <Form onSubmit={handleSubmit}>
                <Stack gap={3}>
                    <Form.Group>
                        <Form.Label style={{ color: "var(--text-secondary)" }}>Username</Form.Label>
                        <Form.Control type="text" name="newName" value={formData.newName} onChange={handleChange} style={inputStyle} />
                    </Form.Group>

                    <Form.Group>
                        <Form.Label style={{ color: "var(--text-secondary)" }}>Email Address</Form.Label>
                        <Form.Control type="email" value={user?.email} readOnly disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} />
                    </Form.Group>

                    <hr style={{ borderColor: "var(--accent-border)" }} className="mt-2" />
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 0 }}>Security Verification required to make changes below:</p>

                    <Form.Group>
                        <Form.Label style={{ color: "var(--text-secondary)" }}>Current Password</Form.Label>
                        <Form.Control type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} style={inputStyle} required placeholder="Required to save changes" />
                    </Form.Group>

                    <Form.Group>
                        <Form.Label style={{ color: "var(--text-secondary)" }}>New Password (Optional)</Form.Label>
                        <Form.Control type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} style={inputStyle} placeholder="Leave blank to keep current password" />
                    </Form.Group>

                    <Button type="submit" disabled={isProfileLoading} style={{ backgroundColor: "var(--accent-primary)", border: "none", marginTop: "10px", alignSelf: "flex-start" }}>
                        {isProfileLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </Stack>
            </Form>

            {/* BLOCKED USERS SECTION */}
            <hr style={{ borderColor: "var(--accent-border)" }} className="mt-3" />
            <h4 style={{ color: "var(--text-primary)", marginBottom: "10px" }}>Blocked Users</h4>
            
            {blockedUserDetails.length === 0 ? (
                <p style={{ color: "var(--text-secondary)" }}>You do not have any blocked users.</p>
            ) : (
                <Stack gap={2}>
                    {blockedUserDetails.map(bu => (
                        <div 
                            key={bu._id} 
                            onClick={() => handleBlockSelect(bu._id)}
                            className="d-flex align-items-center justify-content-between p-2" 
                            style={{ 
                                backgroundColor: selectedBlocks.includes(bu._id) ? "var(--bg-card-active)" : "var(--bg-main)", 
                                borderRadius: "8px", 
                                cursor: "pointer",
                                border: selectedBlocks.includes(bu._id) ? "1px solid var(--accent-primary)" : "1px solid transparent",
                                transition: "all 0.2s"
                            }}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <div style={{ height: "40px", width: "40px", borderRadius: "50%", backgroundColor: "var(--accent-danger)", display: "flex", justifyContent: "center", alignItems: "center", color: "white", fontWeight: "bold", fontSize: "1.2rem" }}>
                                    {bu.name.charAt(0).toUpperCase()}
                                </div>
                                <strong style={{ color: "var(--text-primary)" }}>{bu.name}</strong>
                            </div>
                            <Form.Check 
                                type="checkbox"
                                checked={selectedBlocks.includes(bu._id)}
                                readOnly
                                style={{ pointerEvents: "none" }} 
                            />
                        </div>
                    ))}
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={handleUnblockSubmit} 
                        disabled={selectedBlocks.length === 0}
                        style={{ alignSelf: "flex-start", marginTop: "10px", backgroundColor: "var(--accent-primary)", border: "none" }}
                    >
                        Unblock Selected
                    </Button>
                </Stack>
            )}
        </Stack>
    );
};

export default Profile;