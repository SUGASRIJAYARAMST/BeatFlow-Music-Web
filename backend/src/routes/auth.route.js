import { Router } from "express";
import { authCallback, checkAdmin } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();
router.post("/callback", authCallback);
router.get("/check-admin", protectRoute, checkAdmin);

export default router;
