import axios from "axios";
import User from "../models/user.js";
import { Payment } from "../models/payment.model.js";
import { Wallet } from "../models/wallet.model.js";

const APP_ID = process.env.CASHFREE_APP_ID;
const SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const IS_TEST_MODE = process.env.CASHFREE_MODE === "sandbox" || process.env.CASHFREE_MODE === "test" || process.env.NODE_ENV === "development";

const PRICING = {
  daily: { amount: 1, days: 1 },
  monthly: { amount: 29, days: 30 },
  yearly: { amount: 99, days: 365 },
};

export const addToAdminWallet = async (
  amount,
  plan,
  orderId,
  userInfo = null,
) => {
  const admin = await User.findOne({ role: "admin" });
  if (!admin) return;

  let adminWallet = await Wallet.findOne({ clerkId: admin.clerkId });
  if (!adminWallet) {
    adminWallet = await Wallet.create({
      clerkId: admin.clerkId,
      balance: 0,
      transactions: [],
    });
  }

  const userName = userInfo?.fullName || userInfo?.email || "User";
  adminWallet.balance += amount;
  adminWallet.transactions.push({
    type: "credit",
    amount,
    description: `${userName} - ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`,
    orderId,
  });
  await adminWallet.save();
};

export const createOrder = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const { userId: clerkId } = req;

    if (!PRICING[plan]) {
      return res
        .status(400)
        .json({ message: "Invalid plan. Choose daily, monthly, or yearly" });
    }

    const existingPending = await Payment.findOne({
      clerkId,
      status: "pending",
    });
    if (existingPending) {
      existingPending.status = "failed";
      await existingPending.save();
    }

    const pricing = PRICING[plan];
    const orderId = `BF_${clerkId}_${Date.now()}`;

    const user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.email) {
      return res
        .status(400)
        .json({
          message:
            "User email is required for payment. Please update your profile.",
        });
    }

    const customerPhone = user.phoneNumber?.replace(/\D/g, "") || "9999999999";
    const formattedPhone =
      customerPhone.length >= 10 ? customerPhone.slice(-10) : "9999999999";

    await Payment.create({
      userId: user._id,
      clerkId,
      plan,
      amount: pricing.amount,
      cashfreeOrderId: orderId,
      status: "pending",
    });

    if (IS_TEST_MODE) {
      return res.status(200).json({
        success: true,
        testMode: true,
        paymentSessionId: `test_session_${orderId}`,
        orderId,
      });
    }

    const BASE_URL = "https://api.cashfree.com/pg";
    const orderData = {
      order_id: orderId,
      order_amount: pricing.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: clerkId,
        customer_phone: formattedPhone,
        customer_name: user.fullName || "BeatFlow User",
        customer_email: user.email,
      },
      order_meta: {
        return_url: `${process.env.CLIENT_URL}/premium?order_id={order_id}`,
      },
      order_note: `BeatFlow ${plan} subscription`,
    };

    const response = await axios.post(`${BASE_URL}/orders`, orderData, {
      headers: {
        "Content-Type": "application/json",
        "x-client-id": APP_ID,
        "x-client-secret": SECRET_KEY,
        "x-api-version": "2023-08-01",
      },
    });

    res.status(200).json({
      success: true,
      paymentSessionId: response.data.payment_session_id,
      orderId,
    });
  } catch (error) {
    const errorData = error.response?.data || error.message;
    console.error("Cashfree order creation error:", errorData);
    console.error("CASHFREE_APP_ID exists:", !!APP_ID);
    console.error("CASHFREE_SECRET_KEY exists:", !!SECRET_KEY);
    res.status(error.response?.status || 500).json({
      message: "Failed to create payment order",
      error: errorData,
    });
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const { userId: clerkId } = req;

    if (!orderId)
      return res.status(400).json({ message: "orderId is required" });

    const payment = await Payment.findOne({ cashfreeOrderId: orderId });

    if (!payment)
      return res.status(404).json({ message: "Payment record not found" });

    if (payment.status === "success") {
      return res
        .status(200)
        .json({ success: true, message: "Payment already verified" });
    }

    if (IS_TEST_MODE) {
      payment.status = "success";
      payment.cashfreePaymentId = `test_${orderId}`;
      const expiryMs =
        Date.now() + PRICING[payment.plan].days * 24 * 60 * 60 * 1000;
      payment.subscriptionStart = new Date();
      payment.subscriptionEnd = new Date(expiryMs);
      await payment.save();

      const user = await User.findOne({ clerkId });
      if (user) {
        user.isPremium = true;
        user.subscriptionPlan = payment.plan;
        user.subscriptionExpiry = new Date(expiryMs);
        await user.save();
        await addToAdminWallet(payment.amount, payment.plan, orderId, {
          fullName: user.fullName,
          email: user.email,
        });
      }

      return res
        .status(200)
        .json({
          success: true,
          message: "Payment verified, subscription activated",
          plan: payment.plan,
          expiryTimestamp: expiryMs,
        });
    }

    const BASE_URL = "https://api.cashfree.com/pg";
    const response = await axios.get(`${BASE_URL}/orders/${orderId}`, {
      headers: {
        "x-client-id": APP_ID,
        "x-client-secret": SECRET_KEY,
        "x-api-version": "2023-08-01",
      },
    });

    const order = response.data;

    if (order.order_status === "PAID") {
      payment.status = "success";
      payment.cashfreePaymentId = order.cf_payment_id || "";
      const expiryMs =
        Date.now() + PRICING[payment.plan].days * 24 * 60 * 60 * 1000;
      payment.subscriptionStart = new Date();
      payment.subscriptionEnd = new Date(expiryMs);
      await payment.save();

      const user = await User.findOne({ clerkId });
      if (user) {
        user.isPremium = true;
        user.subscriptionPlan = payment.plan;
        user.subscriptionExpiry = new Date(expiryMs);
        await user.save();
        await addToAdminWallet(payment.amount, payment.plan, orderId, {
          fullName: user.fullName,
          email: user.email,
        });
      }

      return res
        .status(200)
        .json({
          success: true,
          message: "Payment verified, subscription activated",
          plan: payment.plan,
          expiryTimestamp: expiryMs,
        });
    }

    if (
      order.order_status === "FAILED" ||
      order.order_status === "CANCELLED" ||
      order.order_status === "EXPIRED"
    ) {
      payment.status = "failed";
      await payment.save();
      return res
        .status(400)
        .json({ success: false, message: "Payment not completed" });
    }

    res
      .status(200)
      .json({ success: false, message: "Payment is still processing" });
  } catch (error) {
    console.log(
      "Payment verification error:",
      error.response?.data || error.message,
    );
    next(error);
  }
};

export const checkSubscription = async (req, res, next) => {
  try {
    const { userId: clerkId } = req;
    const user = await User.findOne({ clerkId });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin" && !user.isPremium) {
      user.isPremium = true;
      user.subscriptionPlan = "admin";
      await user.save();
    }

    // Check if subscription has expired
    let subscriptionExpired = false;
    if (
      user.isPremium &&
      user.subscriptionExpiry &&
      new Date() > user.subscriptionExpiry &&
      user.role !== "admin"
    ) {
      subscriptionExpired = true;
      // Don't auto-update user here, let frontend handle re-authentication
    }

    res.status(200).json({
      isPremium: user.isPremium,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionExpired,
      subscriptionExpiry: user.subscriptionExpiry
        ? new Date(user.subscriptionExpiry).toISOString()
        : null,
      expiryTimestamp: user.subscriptionExpiry
        ? new Date(user.subscriptionExpiry).getTime()
        : null,
    });
  } catch (error) {
    next(error);
  }
};
