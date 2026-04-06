import User from "../models/user.model.js";
import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Payment } from "../models/payment.model.js";
import PasswordChangeRequest from "../models/passwordChangeRequest.model.js";
import Notification from "../models/notification.model.js";
import { clerkClient } from "@clerk/express";
import crypto from "crypto";

const IV_LENGTH = 16;

const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required. Set it in your .env file.",
    );
  }
  return key;
};

const decrypt = (text) => {
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift(), "hex");
  const encrypted = Buffer.from(parts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(getEncryptionKey().slice(0, 32)),
    iv,
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const cached = global.cache?.get("dashboard_stats");
    if (cached) return res.status(200).json(cached);

    const totalSongs = await Song.countDocuments();
    const totalAlbums = await Album.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalPremium = await User.countDocuments({ isPremium: true });
    const totalPlaylists = await Playlist.countDocuments();
    const totalRevenue = await Payment.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const recentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const stats = {
      totalSongs,
      totalAlbums,
      totalUsers,
      totalPremium,
      totalPlaylists,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      recentPayments,
    };

    global.cache?.set("dashboard_stats", stats, 60);
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

export const getAllUsersForAdmin = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .select("-__v -walletPin -currentPassword -passwordChangeExpiry")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(),
    ]);
    res.status(200).json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionDetails = async (req, res, next) => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const subscriptions = await Payment.find({
      createdAt: { $gte: threeDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const activeSubscribers = await User.find({
      isPremium: true,
      role: { $ne: "admin" },
    })
      .select("fullName clerkId subscriptionPlan subscriptionExpiry isPremium")
      .lean();

    res.status(200).json({ subscriptions, activeSubscribers });
  } catch (error) {
    next(error);
  }
};

export const toggleUserPremium = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isPremium, plan, expiryDate } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isPremium = isPremium;
    if (isPremium && plan && expiryDate) {
      user.subscriptionPlan = plan;
      user.subscriptionExpiry = new Date(expiryDate);
    } else {
      user.subscriptionPlan = "none";
      user.subscriptionExpiry = null;
    }
    await user.save();
    res.status(200).json({ message: "User premium status updated", user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const clerkId = user.clerkId;

    await Playlist.deleteMany({ creatorId: clerkId });
    await Payment.deleteMany({ clerkId });

    try {
      const clerkResponse = await fetch(
        `https://api.clerk.com/v1/users/${clerkId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (clerkResponse.ok) {
        console.log(`User deleted from Clerk: ${clerkId}`);
      } else {
        console.log(`Clerk deletion skipped: ${clerkResponse.status}`);
      }
    } catch (clerkError) {
      console.log("Clerk deletion skipped:", clerkError.message);
    }

    await User.findByIdAndDelete(req.params.userId);
    res.status(200).json({ message: "User and related data deleted" });
  } catch (error) {
    next(error);
  }
};

export const getPasswordChangeRequests = async (req, res, next) => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const requests = await PasswordChangeRequest.find({
      status: "pending",
      createdAt: { $gt: threeDaysAgo },
    })
      .select("-currentPassword -newPassword")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};

export const approvePasswordChange = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const request = await PasswordChangeRequest.findById(requestId);

    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending")
      return res.status(400).json({ message: "Request already processed" });

    if (!clerkClient) {
      return res.status(500).json({ message: "Clerk not configured" });
    }

    try {
      let decryptedNewPassword;
      try {
        decryptedNewPassword = decrypt(request.newPassword);
      } catch (decryptError) {
        console.error(
          "Failed to decrypt password (key mismatch):",
          decryptError.message,
        );
        return res
          .status(400)
          .json({
            message:
              "This request was encrypted with an old key. Please ask the user to submit a new password change request.",
          });
      }

      console.log(`Attempting to set password for user: ${request.clerkId}`);

      let clerkPasswordUpdated = false;
      try {
        const response = await fetch(
          `https://api.clerk.com/v1/users/${request.clerkId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ password: decryptedNewPassword }),
          },
        );

        if (response.ok) {
          clerkPasswordUpdated = true;
          console.log("Password set successfully via Clerk API");
        } else {
          const errData = await response.text();
          console.log("Clerk password update skipped:", errData);
        }
      } catch (clerkError) {
        console.log(
          "Clerk password update skipped (user may be OAuth-only):",
          clerkError.message,
        );
      }

      const user = await User.findById(request.userId);
      if (user) {
        user.previousPassword = user.currentPassword;
        user.currentPassword = request.newPassword;
        user.passwordChangeExpiry = null;
        await user.save();
        console.log(
          `User DB updated. previousPassword: ${user.previousPassword ? "set" : "null"}, currentPassword: ${user.currentPassword ? "set" : "null"}`,
        );
      }

      const notification = new Notification({
        userId: request.userId,
        clerkId: request.clerkId,
        title: "Password Change Approved",
        message:
          "Your password change request has been approved by admin. Your new password is now active.",
        type: "success",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await notification.save();

      global.broadcastEvent?.(
        "password-change-approved",
        {
          id: notification._id.toString(),
          title: notification.title,
          message: notification.message,
          type: notification.type,
          read: false,
          createdAt: notification.createdAt.toISOString(),
        },
        request.clerkId,
      );

      request.status = "approved";
      request.approvedAt = new Date();
      request.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await request.save();

      res
        .status(200)
        .json({ message: "Password updated successfully for user." });
    } catch (clerkError) {
      console.error("Clerk password update error:", clerkError);
      return res
        .status(400)
        .json({
          message:
            "Failed to update password in Clerk. User may not have a password set.",
        });
    }
  } catch (error) {
    next(error);
  }
};

export const rejectPasswordChange = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const request = await PasswordChangeRequest.findById(requestId);

    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending")
      return res.status(400).json({ message: "Request already processed" });

    const notification = new Notification({
      userId: request.userId,
      clerkId: request.clerkId,
      title: "Password Change Rejected",
      message:
        "Your password change request has been rejected by admin. Please contact admin for more information.",
      type: "error",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await notification.save();

    global.broadcastEvent?.(
      "password-change-rejected",
      {
        id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        createdAt: notification.createdAt.toISOString(),
      },
      request.clerkId,
    );

    request.status = "rejected";
    request.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await request.save();

    res.status(200).json({ message: "Password change request rejected" });
  } catch (error) {
    next(error);
  }
};

export const forceRejectPasswordChange = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const request = await PasswordChangeRequest.findById(requestId);

    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = "rejected";
    request.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await request.save();

    res.status(200).json({ message: "Corrupted request cleared" });
  } catch (error) {
    next(error);
  }
};
