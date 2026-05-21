import { useContext } from "react";
import { Button, Col, Form, Row, Stack } from "react-bootstrap";
import { AuthContext } from "../context/AuthContext";

const Register = () => {
    // Brought in registerUser, registerError, and isRegisterLoading
    const { 
        registerInfo, 
        updateRegisterInfo, 
        registerUser, 
        registerError, 
        isRegisterLoading 
    } = useContext(AuthContext);

    const inputStyle = {
        backgroundColor: "var(--bg-input)",
        color: "var(--text-primary)",
        borderColor: "var(--accent-border)", 
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
        // Added the onSubmit handler here!
        <Form onSubmit={registerUser}>
            <Row style={{ justifyContent: "center", paddingTop: "10%" }}>
                <Col xs={11} sm={8} md={6} lg={4}>
                    <Stack gap={3}>
                        <h2 style={{ color: "var(--text-primary)" }}>Register</h2>

                        <Form.Control 
                            type="text" 
                            placeholder="Name" 
                            style={inputStyle} 
                            onChange={(e) => updateRegisterInfo({ ...registerInfo, name: e.target.value })}
                        />
                        <Form.Control 
                            type="email" 
                            placeholder="Email" 
                            style={inputStyle} 
                            onChange={(e) => updateRegisterInfo({ ...registerInfo, email: e.target.value })}
                        />
                        <Form.Control 
                            type="password" 
                            placeholder="Password" 
                            style={inputStyle} 
                            onChange={(e) => updateRegisterInfo({ ...registerInfo, password: e.target.value })}
                        />
                        
                        <Button 
                            type="submit" 
                            style={{ backgroundColor: "var(--accent-primary)", border: "none" }}
                        >
                            {/* Dynamically change text based on loading state */}
                            {isRegisterLoading ? "Creating account..." : "Register"}
                        </Button>

                        {/* Conditionally render the error box ONLY if an error exists */}
                        {registerError && (
                            <div style={errorStyle}>
                                {registerError}
                            </div>
                        )}
                    </Stack>
                </Col>
            </Row>
        </Form>
    );
};

export default Register;