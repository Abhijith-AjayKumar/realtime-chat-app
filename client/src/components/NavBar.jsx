import { useContext } from "react";
import { Container, Nav, Navbar, Stack, Button } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const NavBar = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    // Check if the current URL path is the profile view
    const isProfilePage = location.pathname === "/profile";
    const isMomentPage = location.pathname === "/moment";

    return (
        <Navbar className="mb-4" style={{ backgroundColor: "var(--bg-surface)", height: "3.75rem" }}>
            <Container>
                <h2>
                    <Link to="/" className="link-light text-decoration-none">
                        ChatApp
                    </Link>
                </h2>
                
                {/* Plain text greeting in the middle */}
                {user && (
                    <span className="d-none d-sm-inline" style={{ color: "var(--text-secondary)" }}>
                        Welcome, <span style={{ color: "var(--text-primary)", fontWeight: "bold" }}>{user.name}</span>
                    </span>
                )}
                
                <Nav>
                    <Stack direction="horizontal" gap={3}>
                        {/* IF LOGGED IN: Show dynamic routing toggle button */}
                        {user && (
                            <>
                                <Button 
                                    variant={isMomentPage ? "primary" : "outline-primary"} 
                                    size="sm" 
                                    onClick={() => navigate(isMomentPage ? "/" : "/moment")}
                                    style={{ 
                                        color: isMomentPage ? "#ffffff" : "var(--accent-primary)", 
                                        borderColor: "var(--accent-primary)",
                                        backgroundColor: isMomentPage ? "var(--accent-primary)" : "transparent",
                                        borderRadius: "50px",
                                        padding: "0.4rem 1.2rem",
                                        fontSize: "0.85rem",
                                        fontWeight: "500",
                                        boxShadow: isMomentPage ? "0 0 14px rgba(126, 104, 86, 0.65)" : "0 0 8px rgba(126, 104, 86, 0.3)",
                                        transition: "all 0.3s ease-in-out"
                                    }}
                                >
                                    ✨ Moment
                                </Button>

                                <Button 
                                    variant={isProfilePage ? "primary" : "outline-primary"} 
                                    size="sm" 
                                    onClick={() => navigate(isProfilePage ? "/" : "/profile")}
                                    style={{ 
                                        color: isProfilePage ? "#ffffff" : "var(--accent-primary)", 
                                        borderColor: "var(--accent-primary)",
                                        backgroundColor: isProfilePage ? "var(--accent-primary)" : "transparent",
                                        borderRadius: "50px",
                                        padding: "0.4rem 1.2rem",
                                        fontSize: "0.85rem",
                                        fontWeight: "500",
                                        boxShadow: isProfilePage ? "0 0 14px rgba(126, 104, 86, 0.65)" : "0 0 8px rgba(126, 104, 86, 0.3)",
                                        transition: "all 0.3s ease-in-out"
                                    }}
                                >
                                    {isProfilePage ? "💬 Active Chats" : "👤 Profile"}
                                </Button>
                            </>
                        )}

                        {/* IF NOT LOGGED IN: Show Login and Register */}
                        {!user && (
                            <>
                                <Link to="/login" className="link-light text-decoration-none">
                                    Login
                                </Link>
                                <Link to="/register" className="link-light text-decoration-none">
                                    Register
                                </Link>
                            </>
                        )}
                    </Stack>
                </Nav>
            </Container>
        </Navbar>
    );
}
 
export default NavBar;