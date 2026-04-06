import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createOrder,
  verifyPayment,
  checkSubscription,
} from "../controllers/payment.controller.js";

const router = Router();
router.post("/create-order", protectRoute, createOrder);
router.post("/verify", protectRoute, verifyPayment);
router.get("/check-subscription", protectRoute, checkSubscription);

export default router;
