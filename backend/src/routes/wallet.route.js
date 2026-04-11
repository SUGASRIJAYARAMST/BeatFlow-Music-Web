import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { walletLimiter } from "../middleware/rateLimiter.js";
import {
  getWallet,
  addMoney,
  payFromWallet,
  withdrawFromWallet,
  clearTransactions,
  syncPastPayments,
} from "../controllers/wallet.controller.js";

const router = express.Router();

router.get("/", protectRoute, walletLimiter, getWallet);
router.post("/add-money", protectRoute, walletLimiter, addMoney);
router.post("/pay", protectRoute, walletLimiter, payFromWallet);
router.post("/withdraw", protectRoute, walletLimiter, withdrawFromWallet);
router.post("/clear-transactions", protectRoute, walletLimiter, clearTransactions);
router.post("/sync-payments", protectRoute, walletLimiter, syncPastPayments);

export default router;
