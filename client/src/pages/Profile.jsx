import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext"; 
import { Form, Button, Stack, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom"; 

const Profile = () => {
    // 1. We keep your Auth Context for profile updates and logout
    const { user, updateProfile, profileError, profileSuccess, isProfileLoading, logoutUser } = useContext(AuthContext);
    
    // 2. We use the Chat Context for the LIVE blocked list, all users, and the bulk unblock action
    const { allUsers, blockedUsersList, unblockSelectedUsers } = useContext(ChatContext);
    const navigate = useNavigate(); 

    const [formData, setFormData] = useState({
        _id: user?._id,
        currentPassword: "",
        newName: user?.name || "",
        newPassword: ""
    });

    const [selectedBlocks, setSelectedBlocks] = useState([]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        updateProfile(formData);
        setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "" }));
    };

    // Toggle multi-select block checkboxes
    const handleBlockSelect = (userId) => {
        setSelectedBlocks(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleUnblockSubmit = () => {
        // Fire the function from ChatContext, passing the current user ID and the array of checked IDs
        unblockSelectedUsers(user._id, selectedBlocks);
        setSelectedBlocks([]); 
    };

    const inputStyle = { backgroundColor: "#1e1e1e", color: "var(--text-primary)", borderColor: "#3f3f3f" };

    if (!user) return null;

    // Use the live blockedUsersList from ChatContext instead of the static user.blockedUsers
    const blockedUserDetails = allUsers?.filter(u => blockedUsersList?.includes(u._id)) || [];

    return (
        <Stack gap={4} className="chat-box" style={{ backgroundColor: "var(--bg-surface)", borderRadius: "10px", padding: "20px", width: "100%", minHeight: "75vh", maxHeight: "75vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            
            <div className="chat-header d-flex justify-content-between align-items-center" style={{ borderBottom: "1px solid #3f3f3f", paddingBottom: "10px" }}>
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

            <Form onSubmit={handleSubmit}>
                <Stack gap={3}>
                    <Form.Group>
                        <Form.Label style={{ color: "var(--text-secondary)" }}>Your Unique Search ID</Form.Label>
                        <div style={{ backgroundColor: "#2b2b2b", padding: "10px", borderRadius: "5px", color: "#66b2ff", fontWeight: "bold", letterSpacing: "1px" }}>
                            {user?.userId}
                        </div>
                    </Form.Group>

                    <Form.Group>
                        <Form.Label style={{ color: "var(--text-secondary)" }}>Username</Form.Label>
                        <Form.Control type="text" name="newName" value={formData.newName} onChange={handleChange} style={inputStyle} />
                    </Form.Group>

                    <Form.Group>
                        <Form.Label style={{ color: "var(--text-secondary)" }}>Email Address</Form.Label>
                        <Form.Control type="email" value={user?.email} readOnly disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} />
                    </Form.Group>

                    <hr className="border-secondary mt-2" />
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 0 }}>Security Verification required to make changes:</p>

                    <Form.Group>
                        <Form.Label style={{ color: "var(--text-secondary)" }}>Current Password</Form.Label>
                        <Form.Control type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} style={inputStyle} required placeholder="Required to save changes" />
                    </Form.Group>

                    <Form.Group>
                        <Form.Label style={{ color: "var(--text-secondary)" }}>New Password (Optional)</Form.Label>
                        <Form.Control type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} style={inputStyle} placeholder="Leave blank to keep current password" />
                    </Form.Group>

                    <Button type="submit" disabled={isProfileLoading} style={{ backgroundColor: "var(--accent-blue)", border: "none", marginTop: "10px", alignSelf: "flex-start" }}>
                        {isProfileLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </Stack>
            </Form>

            {/* RESTORED & UPGRADED BLOCKED USERS SECTION */}
            <hr className="border-secondary mt-3" />
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
                                backgroundColor: selectedBlocks.includes(bu._id) ? "#3f3f3f" : "#2b2b2b", 
                                borderRadius: "8px", 
                                cursor: "pointer",
                                border: selectedBlocks.includes(bu._id) ? "1px solid var(--accent-blue)" : "1px solid transparent",
                                transition: "all 0.2s"
                            }}
                        >
                            <div className="d-flex align-items-center gap-3">
                                {/* AVATAR CIRCLE */}
                                <div style={{ height: "40px", width: "40px", borderRadius: "50%", backgroundColor: "var(--accent-danger)", display: "flex", justifyContent: "center", alignItems: "center", color: "white", fontWeight: "bold", fontSize: "1.2rem" }}>
                                    {bu.name.charAt(0).toUpperCase()}
                                </div>
                                <strong style={{ color: "var(--text-primary)" }}>{bu.name}</strong>
                            </div>
                            <Form.Check 
                                type="checkbox"
                                checked={selectedBlocks.includes(bu._id)}
                                readOnly
                                style={{ pointerEvents: "none" }} // Keeps the row clickable without double-firing the checkbox
                            />
                        </div>
                    ))}
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={handleUnblockSubmit} 
                        disabled={selectedBlocks.length === 0}
                        style={{ alignSelf: "flex-start", marginTop: "10px", backgroundColor: "var(--accent-blue)", border: "none" }}
                    >
                        Unblock Selected
                    </Button>
                </Stack>
            )}
        </Stack>
    );
};

export default Profile;