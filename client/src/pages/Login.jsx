import { useContext, useEffect } from "react"; // <-- Added useEffect
import { Button, Col, Form, Row, Stack } from "react-bootstrap";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom"; // <-- Added useNavigate

const Login = () => {
    const { loginUser, loginError, loginInfo, updateLoginInfo, isLoginLoading, user } = useContext(AuthContext);
    const navigate = useNavigate(); // <-- Initialize the navigation hook

    // REDIRECT ENGINE: The moment the 'user' state is filled, redirect to the dashboard!
    useEffect(() => {
        if (user) {
            navigate("/");
        }
    }, [user, navigate]);

    const inputStyle = {
        backgroundColor: "var(--bg-surface)",
        color: "var(--text-primary)",
        borderColor: "#3f3f3f", 
    };

    const errorStyle = {
        backgroundColor: "rgba(255, 69, 58, 0.1)", 
        color: "#ff453a", 
        border: "1px solid rgba(255, 69, 58, 0.3)",
        borderRadius: "8px",
        padding: "10px",
        textAlign: "center",
        fontSize: "0.95rem",
        fontWeight: "500"
    };

    return (
        <Form onSubmit={loginUser}>
            <Row style={{ justifyContent: "center", paddingTop: "10%" }}>
                <Col xs={6}>
                    <Stack gap={3}>
                        <h2 style={{ color: "var(--text-primary)" }}>Login</h2>

                        <Form.Control 
                            type="email" 
                            placeholder="Email" 
                            style={inputStyle} 
                            value={loginInfo.email}
                            onChange={(e) => updateLoginInfo({ email: e.target.value })}
                        />
                        <Form.Control 
                            type="password" 
                            placeholder="Password" 
                            style={inputStyle} 
                            value={loginInfo.password}
                            onChange={(e) => updateLoginInfo({ password: e.target.value })}
                        />
                        
                        <Button 
                            type="submit" 
                            style={{ backgroundColor: "var(--accent-blue)", border: "none" }}
                            disabled={isLoginLoading}
                        >
                            {isLoginLoading ? "Logging in..." : "Login"}
                        </Button>

                        {loginError && (
                            <div style={errorStyle}>
                                {loginError}
                            </div>
                        )}
                    </Stack>
                </Col>
            </Row>
        </Form>
    );
};

export default Login;