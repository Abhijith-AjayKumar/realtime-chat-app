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
                    <span style={{ color: "var(--text-secondary)" }}>
                        Welcome, <span style={{ color: "var(--text-primary)", fontWeight: "bold" }}>{user.name}</span>
                    </span>
                )}
                
                <Nav>
                    <Stack direction="horizontal" gap={3}>
                        {/* IF LOGGED IN: Show dynamic routing toggle button */}
                        {user && (
                            <Button 
                                variant={isProfilePage ? "primary" : "outline-primary"} 
                                size="sm" 
                                onClick={() => navigate(isProfilePage ? "/" : "/profile")}
                                style={{ 
                                    color: isProfilePage ? "#ffffff" : "var(--accent-blue)", 
                                    borderColor: "var(--accent-blue)",
                                    backgroundColor: isProfilePage ? "var(--accent-blue)" : "transparent",
                                    borderRadius: "50px",
                                    padding: "0.4rem 1.2rem",
                                    fontSize: "0.85rem",
                                    fontWeight: "500"
                                }}
                            >
                                {isProfilePage ? "💬 Active Chats" : "👤 Profile"}
                            </Button>
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