import { getAuth } from "@clerk/express";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    let userId = null;
    let userEmail = null;
    
    const auth = getAuth(req);
    if (auth?.userId) {
      userId = auth.userId;
      console.log("✅ Auth via Clerk SDK:", userId);
    }
    
    if (!userId && req.headers.authorization?.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.slice(7);
        if (token.startsWith("user_")) {
          userId = token;
          console.log("✅ Auth via Bearer token:", userId);
        }
      } catch (e) {
      }
    }

    if (!userId) {
      console.warn("❌ Auth failed - no userId found");
      console.warn("Clerk auth:", auth);
      console.warn("Authorization header:", req.headers.authorization ? "present" : "missing");
      console.warn("Request path:", req.path);
      console.warn("Request method:", req.method);
      return res.status(401).json({ message: "Unauthorized - No userId found" });
    }

    req.userId = userId;
    let user = await User.findOne({ clerkId: userId }).lean();
    
    if (!user) {
      console.log(`Auto-creating user for clerkId: ${userId}`);
      const newUser = await User.create({
        clerkId: userId,
        fullName: "BeatFlow User",
        email: auth?.email || "unknown@beatflow.app",
        role: "user",
        isPremium: false,
      });
      user = newUser.toObject();
    }
    
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
