import express from "express";
import { 
    registerUser, 
    loginUser, 
    findUsers, 
    searchByUserId, 
    updateProfile, 
    toggleBlockUser, 
    unblockMultipleUsers,
    updateSearchId
} from "../Controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", findUsers);
router.get("/search/:searchId", searchByUserId);
router.put("/profile", updateProfile);
router.put("/toggle-block", toggleBlockUser);
router.put("/unblock-multiple", unblockMultipleUsers);
router.put("/update-id", updateSearchId);

export default router;