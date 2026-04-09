import { getAuth } from "@clerk/express";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    let userId = req.userId;
    
    if (!userId) {
      const auth = getAuth(req);
      userId = auth?.userId;
    }
    
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const { decode } = await import("jwt-decode");
          const token = authHeader.slice(7);
          const decoded = decode(token);
          userId = decoded?.sub || decoded?.userId;
        } catch (e) {
          console.log("Token decode error:", e.message);
        }
      }
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - No userId found" });
    }

    req.userId = userId;
    const user = await User.findOne({ clerkId: userId }).lean();
    req.user = user;
    req.userEmail = user?.email;
    next();
  } catch (error) {
    console.log("ProtectRoute Error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const requireAdmin = async (req, res, next) => {
  try {
    const isAdminEmail = req.userEmail === process.env.ADMIN_EMAIL;
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
