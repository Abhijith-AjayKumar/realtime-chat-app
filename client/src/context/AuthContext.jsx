import { createContext, useCallback, useEffect, useState } from "react";
import { baseUrl, postRequest, putRequest } from "../utils/services";

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // 🔥 FIX: Added the missing state variable
    const [blockedUsersList, setBlockedUsersList] = useState([]);

    const [registerError, setRegisterError] = useState(null);
    const [isRegisterLoading, setIsRegisterLoading] = useState(false);
    const [registerInfo, setRegisterInfo] = useState({ name: "", email: "", password: "" });

    const [loginError, setLoginError] = useState(null);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [loginInfo, setLoginInfo] = useState({ email: "", password: "" });

    const [profileError, setProfileError] = useState(null);
    const [profileSuccess, setProfileSuccess] = useState(null);
    const [isProfileLoading, setIsProfileLoading] = useState(false);

    const [idUpdateError, setIdUpdateError] = useState(null);
    const [idUpdateSuccess, setIdUpdateSuccess] = useState(null);
    const [isIdUpdating, setIsIdUpdating] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            // 🔥 Sync the block list when the app loads
            setBlockedUsersList(parsedUser.blockedUsers || []);
        }
    }, []);

    // 🔥 FIX: Add an effect to keep the list synced if user object updates
    useEffect(() => {
        if (user) {
            setBlockedUsersList(user.blockedUsers || []);
        }
    }, [user]);

    const updateRegisterInfo = useCallback((info) => {
        setRegisterInfo((prevInfo) => ({ ...prevInfo, ...info }));
    }, []);

    const registerUser = useCallback(async (e) => {
        e.preventDefault(); 
        setIsRegisterLoading(true);
        setRegisterError(null);
        
        const response = await postRequest(`${baseUrl}/users/register`, registerInfo);
        setIsRegisterLoading(false);
        
        if (response.error) {
            setRegisterError(response.message);
            setTimeout(() => setRegisterError(null), 3000);
            return; 
        }
        
        localStorage.setItem("user", JSON.stringify(response));
        setUser(response);
    }, [registerInfo]);

    const updateLoginInfo = useCallback((info) => {
        setLoginInfo((prevInfo) => ({ ...prevInfo, ...info }));
    }, []);

    const loginUser = useCallback(async (e) => {
        e.preventDefault(); 
        setIsLoginLoading(true);
        setLoginError(null);
        
        const response = await postRequest(`${baseUrl}/users/login`, loginInfo);
        setIsLoginLoading(false);
        
        if (response.error) {
            setLoginError(response.message);
            setTimeout(() => setLoginError(null), 3000);
            return;
        }
        
        localStorage.setItem("user", JSON.stringify(response));
        setUser(response);
        window.location.href = "/";
    }, [loginInfo]);

    const updateProfile = useCallback(async (profileData) => {
        setIsProfileLoading(true);
        setProfileError(null);
        setProfileSuccess(null);

        const response = await putRequest(`${baseUrl}/users/profile`, profileData);
        setIsProfileLoading(false);

        if (response.error) return setProfileError(response.message);

        localStorage.setItem("user", JSON.stringify(response));
        setUser(response);
        setProfileSuccess("Profile updated successfully!");
        setTimeout(() => setProfileSuccess(null), 3000);
    }, []);

    const updateUserBlockedList = useCallback((newList) => {
        if (user) {
            const updatedUser = { ...user, blockedUsers: newList };
            setUser(updatedUser);
            setBlockedUsersList(newList); // 🔥 Sync state
            localStorage.setItem("user", JSON.stringify(updatedUser));
        }
    }, [user]);

    const toggleBlockUser = async (targetUserId) => {
        const response = await putRequest(`${baseUrl}/users/block`, { 
            currentUserId: user._id, 
            targetUserId 
        });

        if (!response.error) {
            // Update local user state
            setUser(prev => ({ ...prev, blockedUsers: response }));
            // 🔥 Now this exists!
            setBlockedUsersList(response);
        }
    };

    const unblockMultiple = useCallback(async (targetUserIds) => {
        const response = await putRequest(`${baseUrl}/users/unblock-multiple`, {
            currentUserId: user._id,
            targetUserIds
        });
        
        if (response.error) return console.log(response.error);
        updateUserBlockedList(response);
    }, [user, updateUserBlockedList]);

    const logoutUser = useCallback(() => {
        localStorage.removeItem("user");
        setUser(null);
        window.location.href = "/login";
    }, []);

    const updateSearchId = useCallback(async (newSearchId) => {
        setIsIdUpdating(true);
        setIdUpdateError(null);
        setIdUpdateSuccess(null);

        const response = await putRequest(`${baseUrl}/users/update-id`, {
            _id: user._id,
            newSearchId: newSearchId
        });

        setIsIdUpdating(false);

        if (response.error) {
            setIdUpdateError(response.message);
            setTimeout(() => setIdUpdateError(null), 3000);
            return false;
        }

        const updatedUser = { ...user, userId: response.userId };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        
        setIdUpdateSuccess("Search ID updated successfully!");
        setTimeout(() => setIdUpdateSuccess(null), 3000);
        return true;
    }, [user]);

    return (
        <AuthContext.Provider 
            value={{ 
                user,
                registerInfo,
                updateRegisterInfo,
                registerUser,
                registerError,
                isRegisterLoading,
                logoutUser,
                loginInfo,
                updateLoginInfo,
                loginUser,
                loginError,
                isLoginLoading,
                updateProfile,
                profileError,
                profileSuccess,
                isProfileLoading,
                toggleBlockUser,
                unblockMultiple,
                updateUserBlockedList,
                blockedUsersList, // 🔥 Exported so components can see it
                updateSearchId,
                idUpdateError,
                idUpdateSuccess,
                isIdUpdating
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};