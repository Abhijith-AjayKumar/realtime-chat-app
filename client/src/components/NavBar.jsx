import { useContext } from "react";
import { Container, Nav, Navbar, Stack, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const NavBar = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

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
                        {/* IF LOGGED IN: Show dedicated Profile Button */}
                        {user && (
                            <Button 
                                variant="outline-primary" 
                                size="sm" 
                                onClick={() => navigate("/profile")}
                                style={{ color: "var(--accent-blue)", borderColor: "var(--accent-blue)" }}
                            >
                                Profile
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