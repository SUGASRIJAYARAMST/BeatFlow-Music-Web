import { getAuth } from "@clerk/express";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    let userId = null;
    let userEmail = null;
    
    // First try Clerk SDK
    const auth = getAuth(req);
    if (auth?.userId) {
      userId = auth.userId;
      console.log("✅ Auth via Clerk SDK:", userId);
    }
    
    // Fallback: Accept Bearer token from headers if Clerk token not found
    // This allows testing with curl, Postman, and other clients
    if (!userId && req.headers.authorization?.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.slice(7);
        // Check if it looks like a Clerk user ID (starts with user_)
        if (token.startsWith("user_")) {
          userId = token;
          console.log("✅ Auth via Bearer token:", userId);
        }
      } catch (e) {
        // Ignore token parsing errors, continue to unauthorized response
      }
    }

    if (!userId) {
      // Debug info
      console.warn("❌ Auth failed - no userId found");
      console.warn("Clerk auth:", auth);
      console.warn("Authorization header:", req.headers.authorization ? "present" : "missing");
      console.warn("Request path:", req.path);
      console.warn("Request method:", req.method);
      return res.status(401).json({ message: "Unauthorized - No userId found" });
    }

    req.userId = userId;
    const user = await User.findOne({ clerkId: userId }).lean();
    req.user = user;
    req.userEmail = user?.email || userEmail;
    next();
  } catch (error) {
    console.error("ProtectRoute Error:", error);
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
