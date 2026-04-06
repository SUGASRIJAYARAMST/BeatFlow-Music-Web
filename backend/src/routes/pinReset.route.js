import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  requestPinReset,
  getMyPinResetRequests,
} from "../controllers/pinReset.controller.js";

const router = Router();

router.post("/", protectRoute, requestPinReset);
router.get("/", protectRoute, getMyPinResetRequests);

export default router;
