import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "./AuthContext";
import { ChatContext } from "./ChatContext";

export const CallContext = createContext();

// --- WEB AUDIO API CALLING TONE SYNTHESIZER ---
class CallSoundManager {
    constructor() {
        this.audioCtx = null;
        this.osc1 = null;
        this.osc2 = null;
        this.gainNode = null;
        this.intervalId = null;
    }

    init() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            this.audioCtx = new AudioContextClass();
        }
    }

    playRinging() {
        if (!this.audioCtx) this.init();
        if (!this.audioCtx) return;
        this.stop();

        const playTone = () => {
            try {
                if (this.audioCtx.state === "suspended") {
                    this.audioCtx.resume();
                }
                this.osc1 = this.audioCtx.createOscillator();
                this.osc2 = this.audioCtx.createOscillator();
                this.gainNode = this.audioCtx.createGain();

                this.osc1.frequency.value = 400; 
                this.osc2.frequency.value = 450;

                this.osc1.connect(this.gainNode);
                this.osc2.connect(this.gainNode);
                this.gainNode.connect(this.audioCtx.destination);

                this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
                this.gainNode.gain.linearRampToValueAtTime(0.2, this.audioCtx.currentTime + 0.1);
                
                this.osc1.start();
                this.osc2.start();

                setTimeout(() => {
                    this.stopOscillators();
                }, 1500);
            } catch (err) {
                console.error("Ringing tone error:", err);
            }
        };

        playTone();
        this.intervalId = setInterval(playTone, 3000);
    }

    playCalling() {
        if (!this.audioCtx) this.init();
        if (!this.audioCtx) return;
        this.stop();

        const playTone = () => {
            try {
                if (this.audioCtx.state === "suspended") {
                    this.audioCtx.resume();
                }
                this.osc1 = this.audioCtx.createOscillator();
                this.gainNode = this.audioCtx.createGain();

                this.osc1.frequency.value = 440;
                this.osc1.connect(this.gainNode);
                this.gainNode.connect(this.audioCtx.destination);

                this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
                this.gainNode.gain.linearRampToValueAtTime(0.1, this.audioCtx.currentTime + 0.05);

                this.osc1.start();

                setTimeout(() => {
                    this.stopOscillators();
                }, 1000);
            } catch (err) {
                console.error("Calling tone error:", err);
            }
        };

        playTone();
        this.intervalId = setInterval(playTone, 2500);
    }

    stopOscillators() {
        try {
            if (this.osc1) {
                this.osc1.stop();
                this.osc1.disconnect();
                this.osc1 = null;
            }
            if (this.osc2) {
                this.osc2.stop();
                this.osc2.disconnect();
                this.osc2 = null;
            }
            if (this.gainNode) {
                this.gainNode.disconnect();
                this.gainNode = null;
            }
        } catch (e) {
            // Ignore
        }
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.stopOscillators();
    }
}

const sounds = new CallSoundManager();

export const CallContextProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const { socket, onlineUsers } = useContext(ChatContext);

    const [callState, setCallState] = useState("idle"); // 'idle' | 'calling' | 'ringing' | 'connected'
    const [callType, setCallType] = useState("voice"); // 'voice' | 'video'
    const [callerInfo, setCallerInfo] = useState(null); // { id, name, profilePic }
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [customAlert, setCustomAlert] = useState(null);

    const peerConnectionRef = useRef(null);
    const incomingSignalRef = useRef(null);
    const pendingIceCandidates = useRef([]);

    const showAlert = useCallback((msg) => {
        setCustomAlert(msg);
    }, []);

    // Keep state ref to access latest value in socket event listeners
    const callStateRef = useRef(callState);
    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

    const callerInfoRef = useRef(callerInfo);
    useEffect(() => {
        callerInfoRef.current = callerInfo;
    }, [callerInfo]);

    // Handle incoming audio/video duration timer
    useEffect(() => {
        let interval = null;
        if (callState === "connected") {
            interval = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        } else {
            setCallDuration(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [callState]);

    const resetCallState = useCallback(() => {
        sounds.stop();
        
        if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
        }
        if (remoteStream) {
            remoteStream.getTracks().forEach((track) => track.stop());
        }

        if (peerConnectionRef.current) {
            try {
                peerConnectionRef.current.close();
            } catch (e) {
                // Ignore
            }
            peerConnectionRef.current = null;
        }

        setCallState("idle");
        setCallType("voice");
        setCallerInfo(null);
        setLocalStream(null);
        setRemoteStream(null);
        setIsMuted(false);
        setIsCameraOff(false);
        incomingSignalRef.current = null;
        pendingIceCandidates.current = [];
    }, [localStream, remoteStream]);

    // Cleanup call on unmount
    useEffect(() => {
        return () => {
            resetCallState();
        };
    }, []);

    // Listen for sockets signaling events
    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = ({ signalData, from, fromName, fromProfilePic, isVoiceCall }) => {
            // Auto decline if already occupied
            if (callStateRef.current !== "idle") {
                socket.emit("declineCall", { to: from });
                return;
            }

            sounds.playRinging();
            setCallState("ringing");
            setCallType(isVoiceCall ? "voice" : "video");
            setCallerInfo({ id: from, name: fromName, profilePic: fromProfilePic });
            incomingSignalRef.current = signalData;
        };

        const handleCallAccepted = async ({ signalData }) => {
            sounds.stop();
            setCallState("connected");

            if (peerConnectionRef.current) {
                try {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signalData));
                    // Add queued candidates
                    while (pendingIceCandidates.current.length > 0) {
                        const cand = pendingIceCandidates.current.shift();
                        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
                    }
                } catch (err) {
                    console.error("Error setting remote description on accepted:", err);
                }
            }
        };

        const handleIceCandidate = async ({ candidate }) => {
            if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
                try {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error("Error applying ICE candidate:", err);
                }
            } else {
                pendingIceCandidates.current.push(candidate);
            }
        };

        const handleEndCall = () => {
            resetCallState();
        };

        const handleDeclineCall = () => {
            resetCallState();
            showAlert("The call was declined or the user is busy.");
        };

        socket.on("incomingCall", handleIncomingCall);
        socket.on("callAccepted", handleCallAccepted);
        socket.on("iceCandidate", handleIceCandidate);
        socket.on("endCall", handleEndCall);
        socket.on("declineCall", handleDeclineCall);

        return () => {
            socket.off("incomingCall", handleIncomingCall);
            socket.off("callAccepted", handleCallAccepted);
            socket.off("iceCandidate", handleIceCandidate);
            socket.off("endCall", handleEndCall);
            socket.off("declineCall", handleDeclineCall);
        };
    }, [socket, resetCallState]);

    const initiateCall = useCallback(async (recipientId, recipientName, recipientProfilePic, isVoiceCall) => {
        if (!socket) return;

        // Verify user is online
        const isOnline = onlineUsers.some((u) => u.userId === recipientId);
        if (!isOnline) {
            showAlert("User is offline and cannot be called.");
            return;
        }

        sounds.playCalling();
        setCallState("calling");
        setCallType(isVoiceCall ? "voice" : "video");
        setCallerInfo({ id: recipientId, name: recipientName, profilePic: recipientProfilePic });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: !isVoiceCall
            });
            setLocalStream(stream);

            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:stun1.l.google.com:19302" }
                ]
            });
            peerConnectionRef.current = pc;
            pendingIceCandidates.current = [];

            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            pc.onicecandidate = (event) => {
                if (event.candidate && callerInfoRef.current) {
                    socket.emit("iceCandidate", { to: callerInfoRef.current.id, candidate: event.candidate });
                }
            };

            pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit("callUser", {
                userToCall: recipientId,
                signalData: offer,
                from: user._id,
                fromName: user.name,
                fromProfilePic: user.profilePic || "",
                isVoiceCall
            });
        } catch (err) {
            console.error("Failed to make call:", err);
            showAlert("Could not access audio/video hardware. Please verify permissions.");
            resetCallState();
        }
    }, [socket, onlineUsers, user, resetCallState]);

    const acceptCall = useCallback(async () => {
        sounds.stop();
        if (!socket || !callerInfo) return;

        setCallState("connected");

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: callType === "video"
            });
            setLocalStream(stream);

            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:stun1.l.google.com:19302" }
                ]
            });
            peerConnectionRef.current = pc;

            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            pc.onicecandidate = (event) => {
                if (event.candidate && callerInfoRef.current) {
                    socket.emit("iceCandidate", { to: callerInfoRef.current.id, candidate: event.candidate });
                }
            };

            pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };

            if (incomingSignalRef.current) {
                await pc.setRemoteDescription(new RTCSessionDescription(incomingSignalRef.current));
                // Add queued candidates
                while (pendingIceCandidates.current.length > 0) {
                    const cand = pendingIceCandidates.current.shift();
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                }
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("answerCall", {
                to: callerInfo.id,
                signalData: answer
            });
        } catch (err) {
            console.error("Failed to accept call:", err);
            showAlert("Could not access camera or microphone.");
            socket.emit("declineCall", { to: callerInfo.id });
            resetCallState();
        }
    }, [socket, callerInfo, callType, resetCallState]);

    const declineCall = useCallback(() => {
        sounds.stop();
        if (socket && callerInfo) {
            socket.emit("declineCall", { to: callerInfo.id });
        }
        resetCallState();
    }, [socket, callerInfo, resetCallState]);

    const endCall = useCallback(() => {
        sounds.stop();
        if (socket && callerInfo) {
            socket.emit("endCall", { to: callerInfo.id });
        }
        resetCallState();
    }, [socket, callerInfo, resetCallState]);

    const toggleMute = useCallback(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, [localStream]);

    const toggleVideo = useCallback(() => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);
            }
        }
    }, [localStream]);

    const formatDuration = (sec) => {
        const minutes = Math.floor(sec / 60);
        const seconds = sec % 60;
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    // --- OVERLAYS RENDERING ---
    const renderIncomingCall = () => {
        return (
            <div className="call-overlay-container">
                <div className="call-card">
                    <div className="call-avatar-pulse">
                        {callerInfo?.profilePic ? (
                            <img src={callerInfo.profilePic} alt={callerInfo.name} />
                        ) : (
                            <div className="call-avatar-placeholder">
                                {callerInfo?.name?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <h4 className="text-white mb-1">{callerInfo?.name}</h4>
                    <p className="text-muted mb-4">{callType === "video" ? "Incoming Video Call..." : "Incoming Voice Call..."}</p>
                    <div className="d-flex justify-content-center gap-3">
                        <button className="btn btn-success rounded-pill px-4 py-2 d-flex align-items-center gap-2" onClick={acceptCall}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            <span>Accept</span>
                        </button>
                        <button className="btn btn-danger rounded-pill px-4 py-2 d-flex align-items-center gap-2" onClick={declineCall}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55a2 2 0 0 1 1.18 1.72v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path></svg>
                            <span>Decline</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderOutgoingCall = () => {
        return (
            <div className="call-overlay-container">
                <div className="call-card">
                    <div className="call-avatar-pulse">
                        {callerInfo?.profilePic ? (
                            <img src={callerInfo.profilePic} alt={callerInfo.name} />
                        ) : (
                            <div className="call-avatar-placeholder">
                                {callerInfo?.name?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <h4 className="text-white mb-1">Calling {callerInfo?.name}...</h4>
                    <p className="text-muted mb-4">Ringing...</p>
                    <button className="btn btn-danger rounded-pill px-4 py-2 d-flex align-items-center gap-2 mx-auto" onClick={endCall}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55a2 2 0 0 1 1.18 1.72v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path></svg>
                        <span>Cancel</span>
                    </button>
                </div>
            </div>
        );
    };

    const renderActiveCall = () => {
        return (
            <div className="active-call-fullscreen">
                {callType === "video" ? (
                    <div className="video-grid">
                        {remoteStream ? (
                            <video
                                ref={(el) => {
                                    if (el) el.srcObject = remoteStream;
                                }}
                                autoPlay
                                playsInline
                                className="remote-video"
                            />
                        ) : (
                            <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100 bg-dark text-white">
                                <div className="spinner-border text-light mb-3" role="status"></div>
                                <span>Connecting video stream...</span>
                            </div>
                        )}

                        {!isCameraOff && localStream && (
                            <video
                                ref={(el) => {
                                    if (el) el.srcObject = localStream;
                                }}
                                autoPlay
                                playsInline
                                muted
                                className="local-video-pip"
                            />
                        )}

                        <div className="position-absolute top-0 start-0 p-4" style={{ zIndex: 15 }}>
                            <h4 className="text-white mb-1">{callerInfo?.name}</h4>
                            <span className="badge bg-dark text-white rounded-pill px-3 py-1">
                                {formatDuration(callDuration)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="voice-call-body">
                        <div className="call-avatar-pulse">
                            {callerInfo?.profilePic ? (
                                <img src={callerInfo.profilePic} alt={callerInfo.name} />
                            ) : (
                                <div className="call-avatar-placeholder">
                                    {callerInfo?.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <h3 className="text-white mb-2">{callerInfo?.name}</h3>
                        <p className="text-muted mb-3">Active Voice Call</p>
                        <span className="badge bg-dark text-white rounded-pill px-3 py-2 fs-6">
                            {formatDuration(callDuration)}
                        </span>
                    </div>
                )}

                <div className="call-control-deck">
                    <button
                        className={`call-btn ${isMuted ? "mute-active" : ""}`}
                        onClick={toggleMute}
                        title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                    >
                        {isMuted ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                        )}
                    </button>

                    {callType === "video" && (
                        <button
                            className={`call-btn ${isCameraOff ? "mute-active" : ""}`}
                            onClick={toggleVideo}
                            title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                        >
                            {isCameraOff ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10l-3.5-2.5"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                            )}
                        </button>
                    )}

                    <button className="call-btn hang-up" onClick={endCall} title="End Call">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
                    </button>
                </div>
            </div>
        );
    };

    const renderAlertModal = () => {
        return (
            <div className="alert-overlay-container">
                <div className="alert-card">
                    <div className="mb-3 text-warning">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    </div>
                    <h5 className="text-white mb-2" style={{ fontWeight: "bold" }}>Alert</h5>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.5" }}>{customAlert}</p>
                    <button className="btn btn-green-call rounded-pill px-4 py-2 mt-2 w-100" onClick={() => setCustomAlert(null)}>
                        OK
                    </button>
                </div>
            </div>
        );
    };

    return (
        <CallContext.Provider
            value={{
                callState,
                callType,
                callerInfo,
                localStream,
                remoteStream,
                isMuted,
                isCameraOff,
                callDuration,
                initiateCall,
                acceptCall,
                declineCall,
                endCall,
                toggleMute,
                toggleVideo,
                showAlert
            }}
        >
            {children}
            {callState !== "idle" && (
                <div className="call-overlay-root">
                    {callState === "ringing" && renderIncomingCall()}
                    {callState === "calling" && renderOutgoingCall()}
                    {callState === "connected" && renderActiveCall()}
                </div>
            )}
            {customAlert && renderAlertModal()}
        </CallContext.Provider>
    );
};
