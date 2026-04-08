import { Router } from "express";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
import { createFeedback, getUserFeedback, getAllFeedback, replyToFeedback } from "../controllers/feedback.controller.js";

const router = Router();

router.post("/", protectRoute, createFeedback);
router.get("/my-feedback", protectRoute, getUserFeedback);
router.get("/all", protectRoute, requireAdmin, getAllFeedback);
router.post("/:feedbackId/reply", protectRoute, requireAdmin, replyToFeedback);

export default router;