import { getAuth } from "@clerk/express";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    let userId = null;
    let userEmail = null;
    
    const auth = getAuth(req);
    if (auth?.userId) {
      userId = auth.userId;
    }
    
    // Fallback to Bearer token is no longer supported - use Clerk SDK
    // Bearer tokens should not be accepted for enhanced security

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - No userId found" });
    }

    req.userId = userId;
    const user = await User.findOne({ clerkId: userId }).lean();
    req.user = user;
    req.userEmail = user?.email || userEmail;
    next();
  } catch (error) {
    console.log("ProtectRoute Error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const requireAdmin = async (req, res, next) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const userEmail = req.userEmail?.toLowerCase();
    const isAdminEmail = adminEmail && userEmail === adminEmail;
    const isAdminRole = req.user?.role === "admin";
    
    if (isAdminEmail || isAdminRole) {
      return next();
    }
    return res.status(403).json({ message: "Unauthorized - Not admin" });
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
    
    // Check if subscription is valid without modifying user object
    const isSubscriptionValid = req.user.isPremium && 
      req.user.role !== "admin" &&
      (!req.user.subscriptionExpiry || new Date() <= req.user.subscriptionExpiry);
    
    if (!isSubscriptionValid && req.user.role !== "admin") {
      return res.status(403).json({ message: "Premium subscription required or expired" });
    }
    next();
  } catch (error) {
    console.log("RequirePremium Error:", error);
    next(error);
  }
};
