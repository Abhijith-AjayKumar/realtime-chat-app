import { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { CallContext } from "../context/CallContext";
import { Container, Row, Col, Card, Button, Form, Modal, ProgressBar, Stack } from "react-bootstrap";
import { baseUrl, getRequest, postRequest } from "../utils/services";
import moment from "moment";

const TEXT_BACKGROUNDS = [
    "#29180E", // Mahogany
    "#594B42", // Brume
    "#3B3535", // Silt
    "#7E6856", // Umber
    "#1B0F07"  // Tobacco
];

const MomentPage = () => {
    const { user } = useContext(AuthContext);
    const { showAlert } = useContext(CallContext);
    
    // Status states
    const [moments, setMoments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Posting states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadType, setUploadType] = useState("image_video"); // "image_video" or "text"
    
    // Text status states
    const [textStatus, setTextStatus] = useState("");
    const [bgIndex, setBgIndex] = useState(0);
    
    // Media status states
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState("");
    const [mediaType, setMediaType] = useState(""); // "image" or "video"
    const [caption, setCaption] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    
    // Viewer states
    const [selectedUserMoments, setSelectedUserMoments] = useState(null); // List of moments for a specific user
    const [viewerIndex, setViewerIndex] = useState(0); // Current active moment index in the player
    const [progress, setProgress] = useState(0);
    const [isViewerPaused, setIsViewerPaused] = useState(false);

    const fileInputRef = useRef(null);
    const viewerIntervalRef = useRef(null);
    const progressIntervalRef = useRef(null);

    // Fetch moments on mount
    const fetchMoments = async () => {
        setIsLoading(true);
        try {
            const res = await getRequest(`${baseUrl}/moments`);
            if (!res.error) {
                setMoments(res);
            }
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchMoments();
    }, []);

    // Handle posting a moment
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            showAlert("File exceeds 15MB size limit.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setMediaPreview(reader.result);
            setMediaFile(reader.result);
            if (file.type.startsWith("image/")) {
                setMediaType("image");
            } else if (file.type.startsWith("video/")) {
                setMediaType("video");
            } else {
                showAlert("Only images and videos are supported for moments.");
                setMediaFile(null);
                setMediaPreview("");
            }
        };
        reader.readAsDataURL(file);
    };

    const handlePostMoment = async (e) => {
        e.preventDefault();
        if (!user) return;

        setIsPosting(true);
        let payload = {
            userId: user._id,
            userName: user.name,
            userProfilePic: user.profilePic || ""
        };

        if (uploadType === "text") {
            if (!textStatus.trim()) {
                showAlert("Please type a status.");
                setIsPosting(false);
                return;
            }
            payload.mediaType = "text";
            payload.media = TEXT_BACKGROUNDS[bgIndex];
            payload.text = textStatus;
        } else {
            if (!mediaFile) {
                showAlert("Please select an image or video file.");
                setIsPosting(false);
                return;
            }
            payload.mediaType = mediaType;
            payload.media = mediaFile;
            payload.text = caption;
        }

        try {
            const res = await postRequest(`${baseUrl}/moments`, payload);
            if (!res.error) {
                setShowUploadModal(false);
                // Reset inputs
                setTextStatus("");
                setBgIndex(0);
                setMediaFile(null);
                setMediaPreview("");
                setCaption(null);
                fetchMoments();
            } else {
                showAlert(res.message || "Failed to post moment");
            }
        } catch (err) {
            console.error(err);
        }
        setIsPosting(false);
    };

    // Group moments by creator userId
    const groupMomentsByUser = () => {
        const grouped = {};
        moments.forEach(m => {
            if (!grouped[m.userId]) {
                grouped[m.userId] = {
                    userId: m.userId,
                    userName: m.userName,
                    userProfilePic: m.userProfilePic,
                    userUniqueId: m.userUniqueId,
                    items: []
                };
            }
            grouped[m.userId].items.push(m);
        });
        return Object.values(grouped);
    };

    const userGroupedMoments = groupMomentsByUser();

    // Split my moments and recent updates
    const myMomentsGroup = userGroupedMoments.find(g => g.userId === user?._id);
    const recentMomentsGroups = userGroupedMoments.filter(g => g.userId !== user?._id);

    // Status Viewer Core Logic
    useEffect(() => {
        if (!selectedUserMoments) return;

        // Reset progress when index changes
        setProgress(0);

        const duration = 5000; // 5 seconds per status
        const updateInterval = 50; // Update progress bar every 50ms
        let elapsed = 0;

        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        progressIntervalRef.current = setInterval(() => {
            if (!isViewerPaused) {
                elapsed += updateInterval;
                const percentage = Math.min((elapsed / duration) * 100, 100);
                setProgress(percentage);

                if (elapsed >= duration) {
                    clearInterval(progressIntervalRef.current);
                    handleNextMoment();
                }
            }
        }, updateInterval);

        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [selectedUserMoments, viewerIndex, isViewerPaused]);

    const handleNextMoment = () => {
        if (!selectedUserMoments) return;
        if (viewerIndex < selectedUserMoments.items.length - 1) {
            setViewerIndex(prev => prev + 1);
        } else {
            // Reached the end of moments list for this user -> close viewer
            closeViewer();
        }
    };

    const handlePrevMoment = () => {
        if (!selectedUserMoments) return;
        if (viewerIndex > 0) {
            setViewerIndex(prev => prev - 1);
        } else {
            // Stay at first or reset progress
            setProgress(0);
        }
    };

    const closeViewer = () => {
        setSelectedUserMoments(null);
        setViewerIndex(0);
        setProgress(0);
        setIsViewerPaused(false);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };

    const handleViewerClick = (e) => {
        // Calculate horizontal click percentage to navigate
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        
        if (clickX < width * 0.3) {
            handlePrevMoment();
        } else {
            handleNextMoment();
        }
    };

    return (
        <Container className="py-4 text-white" style={{ minHeight: "80vh" }}>
            <Row className="justify-content-center">
                <Col xs={12} sm={10} md={8} lg={6}>
                    <div className="d-flex align-items-center justify-content-between mb-4 pb-2" style={{ borderBottom: "1px solid var(--accent-border)" }}>
                        <h3 className="m-0 text-white fw-bold fs-5 fs-sm-3">✨ Moment Updates</h3>
                        <Button 
                            variant="primary" 
                            className="rounded-pill px-3 px-sm-4 py-1 py-sm-2 moment-add-btn" 
                            style={{ backgroundColor: "var(--accent-primary)", border: "none" }}
                            onClick={() => setShowUploadModal(true)}
                        >
                            ➕ Add Moment
                        </Button>
                    </div>

                    {/* --- MY MOMENT SECTION --- */}
                    <Card className="card-material p-3 mb-4" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--accent-border)" }}>
                        <h6 style={{ color: "var(--text-secondary)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>My Status</h6>
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                                <div 
                                    className="position-relative" 
                                    style={{ cursor: myMomentsGroup ? "pointer" : "default" }}
                                    onClick={() => {
                                        if (myMomentsGroup) {
                                            setSelectedUserMoments(myMomentsGroup);
                                            setViewerIndex(0);
                                        }
                                    }}
                                >
                                    {user?.profilePic ? (
                                        <img 
                                            src={user.profilePic} 
                                            alt="My avatar" 
                                            style={{ 
                                                width: "55px", 
                                                height: "55px", 
                                                borderRadius: "50%", 
                                                objectFit: "cover",
                                                border: myMomentsGroup ? "3px solid var(--accent-primary)" : "2px solid var(--accent-border)"
                                            }} 
                                        />
                                    ) : (
                                        <div 
                                            className="d-flex justify-content-center align-items-center rounded-circle fw-bold text-white" 
                                            style={{ 
                                                width: "55px", 
                                                height: "55px", 
                                                backgroundColor: "var(--accent-primary)",
                                                border: myMomentsGroup ? "3px solid var(--accent-primary)" : "none"
                                            }}
                                        >
                                            {user?.name?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {myMomentsGroup && (
                                        <span 
                                            className="position-absolute bottom-0 end-0 rounded-circle d-flex justify-content-center align-items-center text-white" 
                                            style={{ width: "18px", height: "18px", backgroundColor: "var(--accent-primary)", fontSize: "0.7rem", border: "2px solid var(--bg-surface)" }}
                                        >
                                            ✓
                                        </span>
                                    )}
                                </div>
                                <div className="d-flex flex-column">
                                    <span className="fw-semibold" style={{ fontSize: "0.95rem" }}>My Status</span>
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                        {myMomentsGroup 
                                            ? `Tap to view ${myMomentsGroup.items.length} status update${myMomentsGroup.items.length > 1 ? "s" : ""}`
                                            : "No status updates posted in the last 24 hours"
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* --- RECENT UPDATES SECTION --- */}
                    <Card className="card-material p-3" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--accent-border)" }}>
                        <h6 style={{ color: "var(--text-secondary)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>Recent Updates</h6>
                        
                        {isLoading ? (
                            <p className="text-center text-muted py-4" style={{ fontSize: "0.9rem" }}>Loading status updates...</p>
                        ) : recentMomentsGroups.length === 0 ? (
                            <div className="text-center py-5">
                                <span style={{ fontSize: "2rem" }}>🎬</span>
                                <p className="text-muted mt-2 mb-0" style={{ fontSize: "0.85rem" }}>No recent status updates to show.</p>
                            </div>
                        ) : (
                            <Stack gap={3}>
                                {recentMomentsGroups.map(group => (
                                    <div 
                                        key={group.userId} 
                                        className="d-flex align-items-center justify-content-between p-2 rounded-3" 
                                        style={{ backgroundColor: "var(--bg-main)", cursor: "pointer", transition: "opacity 0.2s" }}
                                        onClick={() => {
                                            setSelectedUserMoments(group);
                                            setViewerIndex(0);
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = 0.85}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
                                    >
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="position-relative">
                                                {group.userProfilePic ? (
                                                    <img 
                                                        src={group.userProfilePic} 
                                                        alt="Avatar" 
                                                        style={{ 
                                                            width: "50px", 
                                                            height: "50px", 
                                                            borderRadius: "50%", 
                                                            objectFit: "cover",
                                                            border: "3px solid var(--accent-primary)",
                                                            padding: "1px"
                                                        }} 
                                                    />
                                                ) : (
                                                    <div 
                                                        className="d-flex justify-content-center align-items-center rounded-circle fw-bold text-white" 
                                                        style={{ 
                                                            width: "50px", 
                                                            height: "50px", 
                                                            backgroundColor: "var(--accent-secondary)",
                                                            border: "3px solid var(--accent-primary)",
                                                            padding: "1px"
                                                        }}
                                                    >
                                                        {group.userName?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="d-flex flex-column">
                                                <span className="fw-semibold" style={{ fontSize: "0.95rem" }}>{group.userName}</span>
                                                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                                    {moment(group.items[0].createdAt).fromNow()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </Stack>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* ========================================== */}
            {/* UPLOAD MOMENT MODAL                        */}
            {/* ========================================== */}
            <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} centered contentClassName="card-material text-white" style={{ border: "1px solid var(--accent-border)" }}>
                <Modal.Header closeButton closeVariant="white" style={{ borderBottom: "1px solid var(--accent-border)" }}>
                    <Modal.Title className="fs-5">✨ Create status update</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handlePostMoment}>
                        <div className="d-flex justify-content-center gap-3 mb-4">
                            <Button 
                                variant={uploadType === "image_video" ? "primary" : "outline-primary"}
                                size="sm"
                                className="rounded-pill px-3"
                                onClick={() => setUploadType("image_video")}
                                style={{ backgroundColor: uploadType === "image_video" ? "var(--accent-primary)" : "transparent", borderColor: "var(--accent-primary)" }}
                            >
                                🖼️ Image / Video
                            </Button>
                            <Button 
                                variant={uploadType === "text" ? "primary" : "outline-primary"}
                                size="sm"
                                className="rounded-pill px-3"
                                onClick={() => setUploadType("text")}
                                style={{ backgroundColor: uploadType === "text" ? "var(--accent-primary)" : "transparent", borderColor: "var(--accent-primary)" }}
                            >
                                ✍️ Text status
                            </Button>
                        </div>

                        {uploadType === "text" ? (
                            <Stack gap={3}>
                                <div 
                                    className="d-flex justify-content-center align-items-center rounded-3 p-4 text-center" 
                                    style={{ 
                                        backgroundColor: TEXT_BACKGROUNDS[bgIndex], 
                                        minHeight: "180px", 
                                        color: "#ffffff", 
                                        fontSize: "1.3rem", 
                                        fontWeight: "bold",
                                        wordBreak: "break-word"
                                    }}
                                >
                                    {textStatus || "Type your status..."}
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <Button 
                                        size="sm" 
                                        variant="outline-secondary" 
                                        onClick={() => setBgIndex(prev => (prev + 1) % TEXT_BACKGROUNDS.length)}
                                        className="rounded-pill"
                                        style={{ color: "var(--text-primary)", borderColor: "var(--accent-border)" }}
                                    >
                                        🎨 Change background
                                    </Button>
                                </div>
                                <Form.Group>
                                    <Form.Control 
                                        as="textarea"
                                        rows={2}
                                        value={textStatus}
                                        onChange={(e) => setTextStatus(e.target.value)}
                                        placeholder="What is on your mind?"
                                        maxLength={100}
                                        style={{ backgroundColor: "var(--bg-main)", color: "var(--text-primary)", borderColor: "var(--accent-border)" }}
                                    />
                                </Form.Group>
                            </Stack>
                        ) : (
                            <Stack gap={3}>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    style={{ display: "none" }} 
                                    onChange={handleFileChange}
                                    accept="image/*,video/*"
                                />
                                
                                {mediaPreview ? (
                                    <div className="d-flex justify-content-center align-items-center bg-black rounded-3 overflow-hidden" style={{ minHeight: "200px", maxHeight: "300px", position: "relative" }}>
                                        {mediaType === "image" ? (
                                            <img src={mediaPreview} alt="Preview" style={{ maxWidth: "100%", maxHeight: "300px", objectFit: "contain" }} />
                                        ) : (
                                            <video src={mediaPreview} controls style={{ maxWidth: "100%", maxHeight: "300px" }} />
                                        )}
                                        <Button 
                                            size="sm" 
                                            variant="danger" 
                                            className="position-absolute top-0 end-0 m-2 rounded-circle border-0" 
                                            onClick={() => {
                                                setMediaPreview("");
                                                setMediaFile(null);
                                            }}
                                        >
                                            ✕
                                        </Button>
                                    </div>
                                ) : (
                                    <div 
                                        className="d-flex flex-column justify-content-center align-items-center rounded-3 p-5" 
                                        style={{ backgroundColor: "var(--bg-main)", border: "2px dashed var(--accent-border)", cursor: "pointer" }}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <span style={{ fontSize: "2rem" }}>📤</span>
                                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "8px" }}>Click to select Photo or Video</span>
                                    </div>
                                )}

                                <Form.Group>
                                    <Form.Control 
                                        type="text"
                                        placeholder="Add a status caption..."
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        style={{ backgroundColor: "var(--bg-main)", color: "var(--text-primary)", borderColor: "var(--accent-border)" }}
                                    />
                                </Form.Group>
                            </Stack>
                        )}

                        <div className="d-flex justify-content-end gap-2 mt-4 pt-3" style={{ borderTop: "1px solid var(--accent-border)" }}>
                            <Button variant="outline-secondary" className="rounded-pill px-3" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                            <Button 
                                type="submit" 
                                variant="primary" 
                                className="rounded-pill px-4" 
                                disabled={isPosting}
                                style={{ backgroundColor: "var(--accent-primary)", border: "none" }}
                            >
                                {isPosting ? "Sharing..." : "Share Status"}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* ========================================== */}
            {/* WHATSAPP STATUS VIEWER OVERLAY PLAYER      */}
            {/* ========================================== */}
            {selectedUserMoments && (
                <div 
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "#0b0503",
                        zIndex: 2000,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center"
                    }}
                >
                    {/* Status Player Card wrapper */}
                    <div 
                        style={{
                            width: "100%",
                            maxWidth: "480px",
                            height: "100vh",
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            backgroundColor: "#000"
                        }}
                    >
                        {/* 1. Header overlay (Progress indicators, user info, close) */}
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px", zIndex: 10, background: "linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)" }}>
                            {/* Segmented Progress bar */}
                            <div className="d-flex gap-1 mb-3">
                                {selectedUserMoments.items.map((item, idx) => (
                                    <div key={item._id} className="flex-grow-1" style={{ height: "3px", backgroundColor: "rgba(255,255,255,0.3)", borderRadius: "2px", overflow: "hidden" }}>
                                        <div 
                                            style={{
                                                height: "100%",
                                                backgroundColor: "#ffffff",
                                                width: idx === viewerIndex 
                                                    ? `${progress}%` 
                                                    : idx < viewerIndex 
                                                        ? "100%" 
                                                        : "0%",
                                                transition: idx === viewerIndex ? "none" : "width 0.2s"
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* User details */}
                            <div className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-2">
                                    {selectedUserMoments.userProfilePic ? (
                                        <img 
                                            src={selectedUserMoments.userProfilePic} 
                                            alt="avatar" 
                                            style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover" }}
                                        />
                                    ) : (
                                        <div className="d-flex justify-content-center align-items-center rounded-circle fw-bold text-white" style={{ width: "38px", height: "38px", backgroundColor: "var(--accent-secondary)", fontSize: "0.85rem" }}>
                                            {selectedUserMoments.userName?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="d-flex flex-column">
                                        <span className="text-white fw-bold" style={{ fontSize: "0.9rem", lineHeight: "1.2" }}>{selectedUserMoments.userName}</span>
                                        <span style={{ fontSize: "0.75rem", color: "#ccc" }}>
                                            {moment(selectedUserMoments.items[viewerIndex]?.createdAt).fromNow()}
                                        </span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <Button 
                                        variant="link" 
                                        className="text-white p-0 me-2" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsViewerPaused(!isViewerPaused);
                                        }}
                                        style={{ fontSize: "1.1rem", textDecoration: "none" }}
                                    >
                                        {isViewerPaused ? "▶️ Play" : "⏸️ Pause"}
                                    </Button>
                                    <Button 
                                        variant="link" 
                                        className="text-white fs-4 p-0" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            closeViewer();
                                        }}
                                        style={{ textDecoration: "none" }}
                                    >
                                        ✕
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* 2. Interactive Media Container (Tap targets & actual content) */}
                        <div 
                            onClick={handleViewerClick}
                            style={{
                                flexGrow: 1,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                position: "relative",
                                width: "100%",
                                cursor: "pointer"
                            }}
                        >
                            {selectedUserMoments.items[viewerIndex]?.mediaType === "text" && (
                                <div 
                                    className="w-100 h-100 d-flex justify-content-center align-items-center text-center p-4"
                                    style={{
                                        backgroundColor: selectedUserMoments.items[viewerIndex]?.media,
                                        color: "#ffffff",
                                        fontSize: "1.7rem",
                                        fontWeight: "bold",
                                        wordBreak: "break-word"
                                    }}
                                >
                                    {selectedUserMoments.items[viewerIndex]?.text}
                                </div>
                            )}

                            {selectedUserMoments.items[viewerIndex]?.mediaType === "image" && (
                                <img 
                                    src={selectedUserMoments.items[viewerIndex]?.media} 
                                    alt="status" 
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "contain"
                                    }}
                                />
                            )}

                            {selectedUserMoments.items[viewerIndex]?.mediaType === "video" && (
                                <video 
                                    src={selectedUserMoments.items[viewerIndex]?.media} 
                                    autoPlay 
                                    playsInline
                                    muted={false}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "contain"
                                    }}
                                />
                            )}
                        </div>

                        {/* 3. Bottom caption overlay (if exists) */}
                        {selectedUserMoments.items[viewerIndex]?.mediaType !== "text" && selectedUserMoments.items[viewerIndex]?.text && (
                            <div 
                                style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    padding: "24px 16px",
                                    textAlign: "center",
                                    color: "#ffffff",
                                    backgroundColor: "rgba(0,0,0,0.6)",
                                    fontSize: "1rem"
                                }}
                            >
                                {selectedUserMoments.items[viewerIndex]?.text}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Container>
    );
};

export default MomentPage;
