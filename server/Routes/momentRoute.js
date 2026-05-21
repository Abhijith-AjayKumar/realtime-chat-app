import express from "express";
import { createMoment, getMoments } from "../Controllers/momentController.js";

const router = express.Router();

router.post("/", createMoment);
router.get("/", getMoments);

export default router;
