import { Wallet } from "../models/wallet.model.js";
import User from "../models/user.model.js";
import { Payment } from "../models/payment.model.js";
import { addToAdminWallet } from "./payment.controller.js";
import Notification from "../models/notification.model.js";
import { getCurrentOffer } from "./offer.controller.js";

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

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const user = await User.findOne({ clerkId });
    if (user?.role === "admin") {
      return res
        .status(403)
        .json({ message: "Admins cannot add money to wallet" });
    }

    let wallet = await Wallet.findOne({ clerkId });
    if (!wallet) {
      wallet = await Wallet.create({ clerkId, balance: 0, transactions: [] });
    }

    const MAX_WALLET_BALANCE = 200;
    const newBalance = wallet.balance + Number(amount);
    if (newBalance > MAX_WALLET_BALANCE) {
      return res.status(400).json({
        message: `Maximum wallet balance is ₹${MAX_WALLET_BALANCE}. You can only add ₹${MAX_WALLET_BALANCE - wallet.balance} more.`,
        maxAllowed: MAX_WALLET_BALANCE - wallet.balance,
        currentBalance: wallet.balance,
      });
    }

    wallet.balance = newBalance;
    wallet.transactions.push({
      type: "credit",
      amount: Number(amount),
      description: "Wallet top-up",
    });
    await wallet.save();

    res.status(200).json({
      success: true,
      balance: wallet.balance,
      message: `₹${amount} added to wallet`,
    });
  } catch (error) {
    console.error("Add money error:", error);
    res
      .status(500)
      .json({ message: "Failed to add money", error: error.message });
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
