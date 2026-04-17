import { Wallet } from "../models/wallet.model.js";
import User from "../models/user.model.js";
import { Payment } from "../models/payment.model.js";
import { addToAdminWallet } from "./payment.controller.js";
import Notification from "../models/notification.model.js";
import { getCurrentOffer } from "./offer.controller.js";
import axios from "axios";

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_TEST_MODE = !CASHFREE_APP_ID || !CASHFREE_SECRET_KEY || process.env.CASHFREE_MODE === "sandbox" || process.env.CASHFREE_MODE === "test";

const PRICING = {
  daily: { days: 1 },
  monthly: { days: 30 },
  yearly: { days: 365 },
};

const getPlanPrice = async (plan) => {
  const base = plan === "daily" ? 1 : plan === "monthly" ? 29 : 99;
  const offer = await getCurrentOffer();
  if (offer.active && offer.planId === plan && offer.discount > 0) {
    return Math.round(base * (1 - offer.discount / 100));
  }
  return base;
};

export const getWallet = async (req, res, next) => {
  try {
    console.log("getWallet called, userId:", req.userId);
    const { userId: clerkId } = req;

    if (!clerkId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    let wallet = await Wallet.findOne({ clerkId });
    console.log("Wallet found:", wallet);

    if (!wallet) {
      wallet = await Wallet.create({ clerkId, balance: 0, transactions: [] });
      console.log("Created new wallet:", wallet);
    }

    res.status(200).json({
      balance: wallet.balance,
      transactions: wallet.transactions.slice(-20).reverse(),
    });
  } catch (error) {
    console.error("getWallet error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const addMoney = async (req, res, next) => {
  try {
    const { userId: clerkId } = req;
    const { amount } = req.body;

    console.log("addMoney called:", { clerkId, amount });

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const user = await User.findOne({ clerkId });
    console.log("User found:", user ? "yes" : "no", user?._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(403).json({ message: "Admins cannot add money to wallet" });
    }

    let wallet = await Wallet.findOne({ clerkId });
    if (!wallet) {
      wallet = await Wallet.create({ clerkId, balance: 0, transactions: [] });
    }

    const MAX_WALLET_BALANCE = 200;
    if (wallet.balance + Number(amount) > MAX_WALLET_BALANCE) {
      return res.status(400).json({
        message: `Maximum wallet balance is ₹${MAX_WALLET_BALANCE}. You can only add ₹${MAX_WALLET_BALANCE - wallet.balance} more.`,
        maxAllowed: MAX_WALLET_BALANCE - wallet.balance,
        currentBalance: wallet.balance,
      });
    }

    const orderId = `WF_${clerkId}_${Date.now()}`;
    console.log("Creating payment record:", { orderId, amount });

    await Payment.create({
      userId: user._id,
      clerkId,
      plan: "wallet_topup",
      amount: Number(amount),
      cashfreeOrderId: orderId,
      status: "pending",
    });

    console.log("Payment record created successfully");

    if (CASHFREE_TEST_MODE) {
      return res.status(200).json({
        success: true,
        testMode: true,
        paymentSessionId: `test_session_${orderId}`,
        orderId,
        amount: Number(amount),
      });
    }

    const BASE_URL = "https://api.cashfree.com/pg";
    const orderData = {
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: "INR",
      customer_details: {
        customer_id: clerkId,
        customer_phone: user.phoneNumber?.replace(/\D/g, "").slice(-10) || "9999999999",
        customer_name: user.fullName || "BeatFlow User",
        customer_email: user.email,
      },
      order_meta: {
        return_url: `${process.env.CLIENT_URL}/wallet?order_id={order_id}&type=wallet`,
      },
      order_note: "BeatFlow Wallet Top-up",
    };

    const response = await axios.post(`${BASE_URL}/orders`, orderData, {
      headers: {
        "Content-Type": "application/json",
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "x-api-version": "2023-08-01",
      },
    });

    res.status(200).json({
      success: true,
      paymentSessionId: response.data.payment_session_id,
      orderId,
      amount: Number(amount),
    });
  } catch (error) {
    console.error("Add money error:", error);
    console.error("Error details:", error.stack);
    res.status(500).json({ message: "Failed to create payment order", error: error.message, details: error.toString() });
  }
};

export const verifyWalletTopup = async (req, res, next) => {
  try {
    const { userId: clerkId } = req;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    const payment = await Payment.findOne({ cashfreeOrderId: orderId, plan: "wallet_topup" });

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    if (payment.status === "success") {
      return res.status(200).json({ success: true, message: "Payment already verified", balance: payment.amount });
    }

    if (CASHFREE_TEST_MODE) {
      payment.status = "success";
      payment.cashfreePaymentId = `test_wallet_${orderId}`;
      await payment.save();

      let wallet = await Wallet.findOne({ clerkId });
      if (!wallet) {
        wallet = await Wallet.create({ clerkId, balance: 0, transactions: [] });
      }

      wallet.balance += payment.amount;
      wallet.transactions.push({
        type: "credit",
        amount: payment.amount,
        description: "Wallet top-up",
        orderId,
      });
      await wallet.save();

      return res.status(200).json({
        success: true,
        message: "Wallet top-up successful",
        balance: wallet.balance,
        amount: payment.amount,
      });
    }

    const BASE_URL = "https://api.cashfree.com/pg";
    const response = await axios.get(`${BASE_URL}/orders/${orderId}`, {
      headers: {
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "x-api-version": "2023-08-01",
      },
    });

    const order = response.data;

    if (order.order_status === "PAID") {
      payment.status = "success";
      payment.cashfreePaymentId = order.cf_payment_id || "";
      await payment.save();

      let wallet = await Wallet.findOne({ clerkId });
      if (!wallet) {
        wallet = await Wallet.create({ clerkId, balance: 0, transactions: [] });
      }

      wallet.balance += payment.amount;
      wallet.transactions.push({
        type: "credit",
        amount: payment.amount,
        description: "Wallet top-up",
        orderId,
      });
      await wallet.save();

      return res.status(200).json({
        success: true,
        message: "Wallet top-up successful",
        balance: wallet.balance,
        amount: payment.amount,
      });
    }

    if (order.order_status === "FAILED" || order.order_status === "CANCELLED" || order.order_status === "EXPIRED") {
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({ success: false, message: "Payment not completed" });
    }

    res.status(200).json({ success: false, message: "Payment is still processing" });
  } catch (error) {
    console.error("Verify wallet topup error:", error);
    next(error);
  }
};

export const payFromWallet = async (req, res, next) => {
  try {
    const { userId: clerkId } = req;
    const { plan } = req.body;

    if (!PRICING[plan]) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    const user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin") {
      return res.status(403).json({ message: "Admins have free access" });
    }

    const amount = await getPlanPrice(plan);
    let wallet = await Wallet.findOne({ clerkId });

    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({
        message: "Insufficient wallet balance",
        required: amount,
        available: wallet?.balance || 0,
      });
    }

    const existingPending = await Payment.findOne({
      clerkId,
      status: "pending",
    });
    if (existingPending) {
      existingPending.status = "failed";
      await existingPending.save();
    }

    const orderId = `BF_${clerkId}_${Date.now()}`;

    wallet.balance -= amount;
    wallet.transactions.push({
      type: "debit",
      amount: amount,
      description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan subscription`,
      orderId,
    });
    await wallet.save();

    const expiryMs = Date.now() + PRICING[plan].days * 24 * 60 * 60 * 1000;

    await Payment.create({
      userId: user._id,
      clerkId,
      plan,
      amount: amount,
      cashfreeOrderId: orderId,
      status: "success",
      cashfreePaymentId: `wallet_${orderId}`,
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(expiryMs),
    });

    user.isPremium = true;
    user.subscriptionPlan = plan;
    user.subscriptionExpiry = new Date(expiryMs);
    await user.save();

    const notification = new Notification({
      userId: user._id,
      clerkId,
      title: "Pro Subscription Activated",
      message: `Your ${plan} plan has been activated successfully! Enjoy all Pro features.`,
      type: "success",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await notification.save();

    global.broadcastEvent?.(
      "subscription-activated",
      {
        id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        createdAt: notification.createdAt.toISOString(),
      },
      clerkId,
    );

    await addToAdminWallet(amount, plan, orderId, {
      fullName: user.fullName,
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: "Subscription activated",
      balance: wallet.balance,
      plan,
      expiryTimestamp: expiryMs,
    });
  } catch (error) {
    next(error);
  }
};

export const withdrawFromWallet = async (req, res, next) => {
  try {
    const { userId: clerkId } = req;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    let wallet = await Wallet.findOne({ clerkId });
    if (!wallet) {
      return res.status(400).json({ message: "Wallet not found" });
    }
    if (wallet.balance < amount) {
      return res.status(400).json({
        message: "Insufficient balance",
        available: wallet?.balance || 0,
      });
    }

    wallet.balance -= amount;
    wallet.transactions.push({
      type: "debit",
      amount,
      description: "Withdrawal",
    });
    await wallet.save();

    res.status(200).json({
      success: true,
      balance: wallet.balance,
      message: "Withdrawal successful",
    });
  } catch (error) {
    console.error("Withdraw error:", error);
    res.status(500).json({ message: "Withdrawal failed" });
  }
};

export const syncPastPayments = async (req, res, next) => {
  try {
    const { userId: clerkId } = req;
    const user = await User.findOne({ clerkId });

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    let adminWallet = await Wallet.findOne({ clerkId });
    if (!adminWallet) {
      adminWallet = await Wallet.create({
        clerkId,
        balance: 0,
        transactions: [],
      });
    }

    const existingOrderIds = adminWallet.transactions.map((t) => t.orderId);
    const pastPayments = await Payment.find({
      status: "success",
    }).populate("userId", "fullName email");

    let syncedCount = 0;
    let totalAmount = 0;

    for (const payment of pastPayments) {
      if (existingOrderIds.includes(payment.cashfreeOrderId)) continue;
      if (payment.clerkId === clerkId) continue;

      const userName = payment.userId?.fullName || "User";

      adminWallet.balance += payment.amount;
      adminWallet.transactions.push({
        type: "credit",
        amount: payment.amount,
        description: `${userName} - ${payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)} plan`,
        orderId: payment.cashfreeOrderId,
        createdAt: payment.subscriptionStart || payment.createdAt,
      });

      syncedCount++;
      totalAmount += payment.amount;
    }

    await adminWallet.save();

    res.status(200).json({
      success: true,
      message: `Synced ${syncedCount} past payments`,
      amount: totalAmount,
      balance: adminWallet.balance,
    });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ message: "Failed to sync payments" });
  }
};

export const clearTransactions = async (req, res, next) => {
  try {
    const { userId: clerkId } = req;

    let wallet = await Wallet.findOne({ clerkId });
    if (!wallet) {
      return res.status(400).json({ message: "Wallet not found" });
    }

    wallet.transactions = [];
    await wallet.save();

    res.status(200).json({
      success: true,
      message: "All transactions cleared",
    });
  } catch (error) {
    console.error("Clear transactions error:", error);
    res.status(500).json({ message: "Failed to clear transactions" });
  }
};
