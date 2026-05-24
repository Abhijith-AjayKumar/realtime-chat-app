import React, { useState, useRef } from "react";

const AudioPlayer = ({ src }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(err => {
                console.error("Playback error:", err);
            });
        }
    };

    const handleSeek = (e) => {
        if (!audioRef.current) return;
        const time = parseFloat(e.target.value);
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };

    return (
        <div className="custom-audio-player d-flex align-items-center gap-2 px-2 py-1 rounded-pill">
            <audio 
                ref={audioRef} 
                src={src} 
                preload="metadata"
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onDurationChange={(e) => setDuration(e.target.duration)}
                onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                }}
            />
            <button 
                type="button" 
                onClick={togglePlay} 
                className="play-pause-btn rounded-circle d-flex align-items-center justify-content-center border-0"
                style={{
                    width: "28px",
                    height: "28px",
                    backgroundColor: "var(--accent-primary)",
                    color: "#fff",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    flexShrink: 0
                }}
            >
                {isPlaying ? "⏸" : "▶"}
            </button>
            <div className="flex-grow-1 d-flex flex-column justify-content-center overflow-hidden" style={{ minWidth: "60px" }}>
                <input 
                    type="range" 
                    min="0" 
                    max={duration || 100} 
                    value={currentTime} 
                    onChange={handleSeek}
                    className="audio-seeker w-100"
                    style={{
                        height: "4px",
                        accentColor: "var(--accent-primary)",
                        cursor: "pointer"
                    }}
                />
                <div className="d-flex justify-content-between" style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

export default AudioPlayer;
