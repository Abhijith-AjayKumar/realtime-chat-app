import express from "express";
import { 
    registerUser, 
    loginUser, 
    findUsers, 
    searchByUserId, 
    updateProfile, 
    toggleBlockUser, 
    unblockMultipleUsers 
} from "../Controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", findUsers);
router.get("/search/:searchId", searchByUserId);
router.put("/profile", updateProfile);
router.put("/toggle-block", toggleBlockUser);
router.put("/unblock-multiple", unblockMultipleUsers);

export default router;