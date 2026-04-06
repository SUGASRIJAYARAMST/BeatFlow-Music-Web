import { getAuth } from "@clerk/express";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No userId found" });
    }
    req.userId = userId;
    const user = await User.findOne({ clerkId: userId });
    req.user = user;
    next();
  } catch (error) {
    console.log("ProtectRoute Error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized - Not admin" });
    }
    next();
  } catch (error) {
    console.log("RequireAdmin Error:", error);
    next(error);
  }
};

export const requirePremium = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!req.user.isPremium && req.user.role !== "admin") {
      return res.status(403).json({ message: "Premium subscription required" });
    }
    if (
      req.user.isPremium &&
      req.user.subscriptionExpiry &&
      new Date() > req.user.subscriptionExpiry
    ) {
      req.user.isPremium = false;
      req.user.subscriptionPlan = "none";
      await req.user.save();
      return res.status(403).json({ message: "Subscription expired" });
    }
    next();
  } catch (error) {
    console.log("RequirePremium Error:", error);
    next(error);
  }
};
