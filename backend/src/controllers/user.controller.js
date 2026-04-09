import User from "../models/user.model.js";
import PasswordChangeRequest from "../models/passwordChangeRequest.model.js";
import { Song } from "../models/song.model.js";
import { clerkClient } from "@clerk/express";
import bcrypt from "bcrypt";
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

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(getEncryptionKey().slice(0, 32)),
    iv,
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
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

const verifyCurrentPassword = async (clerkId, currentPassword) => {
  try {
    const { createClerkClient } = await import("@clerk/backend");
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const user = await clerk.users.getUser(clerkId);
    if (!user.passwordEnabled) {
      return { verified: false, reason: "no_password" };
    }

    await clerk.users.verifyPassword({
      userId: clerkId,
      password: currentPassword,
    });
    return { verified: true };
  } catch (err) {
    if (err?.errors?.[0]?.code === "form_password_incorrect") {
      return { verified: false, reason: "incorrect" };
    }
    return { verified: false, reason: "error" };
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized - Admin only" });
    }
    const start = Date.now();
    const users = await User.find(
      {},
      {
        fullName: 1,
        imageUrl: 1,
        clerkId: 1,
        email: 1,
        role: 1,
        isPremium: 1,
        subscriptionPlan: 1,
        subscriptionExpiry: 1,
        createdAt: 1,
        walletPin: 0,
        currentPassword: 0,
        passwordChangeExpiry: 0,
        previousPassword: 0,
      },
    )
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    console.log(`getAllUsers query took ${Date.now() - start}ms`);
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const start = Date.now();
    const user = await User.findOne({ clerkId: req.userId })
      .select("-walletPin -previousPassword -passwordChangeExpiry")
      .lean();
    console.log(`getCurrentUser query took ${Date.now() - start}ms`);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUserSettings = async (req, res, next) => {
  try {
    const { notifications, fullName, imageUrl } = req.body;
    const user = await User.findOne({ clerkId: req.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (notifications !== undefined) user.notifications = notifications;
    if (fullName) user.fullName = fullName;
    if (imageUrl) user.imageUrl = imageUrl;

    await user.save();

    if (fullName && clerkClient) {
      try {
        const nameParts = fullName.trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        await clerkClient.users.updateUser(req.userId, {
          firstName,
          lastName,
        });
      } catch (clerkError) {
        console.log("Clerk name update skipped:", clerkError.message);
      }
    }

    res
      .status(200)
      .json({
        message: "Settings updated",
        user: {
          fullName: user.fullName,
          imageUrl: user.imageUrl,
          email: user.email,
          notifications: user.notifications,
        },
      });
  } catch (error) {
    next(error);
  }
};

export const verifyPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password)
      return res.status(400).json({ message: "Password is required" });

    const { createClerkClient } = await import("@clerk/backend");
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    let clerkUser;
    try {
      clerkUser = await clerk.users.getUser(req.userId);
    } catch (clerkErr) {
      return res.status(404).json({ message: "User not found in Clerk" });
    }

    if (!clerkUser.passwordEnabled) {
      return res
        .status(400)
        .json({
          message:
            "This account uses social login. Please set a password in your account settings first.",
        });
    }

    try {
      const result = await clerk.users.verifyPassword({
        userId: req.userId,
        password,
      });
      if (result.verified) {
        res.json({ message: "Password verified" });
      } else {
        res.status(401).json({ message: "Incorrect password" });
      }
    } catch (err) {
      res.status(401).json({ message: "Incorrect password" });
    }
  } catch (error) {
    next(error);
  }
};

export const requestPasswordChange = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res
        .status(400)
        .json({
          message: "Password must contain at least one uppercase letter",
        });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res
        .status(400)
        .json({
          message: "Password must contain at least one lowercase letter",
        });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res
        .status(400)
        .json({ message: "Password must contain at least one number" });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return res
        .status(400)
        .json({
          message: "Password must contain at least one special character",
        });
    }

    if (!currentPassword) {
      return res
        .status(400)
        .json({ message: "Current password is required for verification" });
    }

    const user = await User.findOne({ clerkId: req.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const result = await verifyCurrentPassword(req.userId, currentPassword);
    if (!result.verified) {
      if (result.reason === "no_password") {
        return res
          .status(400)
          .json({
            message:
              "This account uses social login. Please set a password in your account settings first.",
          });
      }
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const lastRequest = await PasswordChangeRequest.findOne({
      userId: user._id,
    }).sort({ createdAt: -1 });

    if (lastRequest) {
      const daysSinceLastRequest =
        (Date.now() - new Date(lastRequest.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastRequest < 7) {
        return res
          .status(400)
          .json({
            message:
              "You can only request password change once per week. Please try again later.",
          });
      }
    }

    const existingRequest = await PasswordChangeRequest.findOne({
      userId: user._id,
      status: "pending",
    });

    const encryptedNewPassword = encrypt(newPassword);
    const encryptedCurrentPassword = encrypt(currentPassword);

    if (existingRequest) {
      existingRequest.currentPassword = encryptedCurrentPassword;
      existingRequest.newPassword = encryptedNewPassword;
      existingRequest.updatedAt = new Date();
      await existingRequest.save();
      return res
        .status(200)
        .json({
          message:
            "Password change request updated and sent to admin for approval",
        });
    }

    const request = new PasswordChangeRequest({
      userId: user._id,
      clerkId: req.userId,
      userEmail: user.email,
      userName: user.fullName,
      currentPassword: encryptedCurrentPassword,
      newPassword: encryptedNewPassword,
    });

    await request.save();

    // Broadcast event to notify admins of new password change request
    global.broadcastEvent?.(
      "password-change-request",
      {
        id: request._id.toString(),
        userId: request.userId.toString(),
        clerkId: request.clerkId,
        userEmail: request.userEmail,
        userName: request.userName,
        createdAt: request.createdAt.toISOString(),
      },
      null,
    ); // null means broadcast to all users (admins will filter by their role)

    if (!user.currentPassword) {
      user.previousPassword = encryptedCurrentPassword;
    } else {
      user.previousPassword = user.currentPassword;
    }
    user.currentPassword = encryptedCurrentPassword;
    await user.save();

    res
      .status(201)
      .json({ message: "Password change request sent to admin for approval" });
  } catch (error) {
    next(error);
  }
};

export const toggleLike = async (req, res, next) => {
  try {
    const { songId } = req.body;
    if (!songId) return res.status(400).json({ message: "songId is required" });

    const user = await User.findOne({ clerkId: req.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isLiked = user.likedSongs.some((id) => id.toString() === songId);
    
    const update = isLiked
      ? { $pull: { likedSongs: songId } }
      : { $addToSet: { likedSongs: songId } };

    await User.findOneAndUpdate({ clerkId: req.userId }, update, { new: true });
    
    res.status(200).json({ success: true, isLiked: !isLiked });
  } catch (error) {
    next(error);
  }
};

export const getLikedSongs = async (req, res, next) => {
  try {
    const start = Date.now();
    const user = await User.findOne({ clerkId: req.userId }).populate({
      path: "likedSongs",
      options: { sort: { createdAt: -1 }, limit: 50 },
    });
    console.log(`Liked songs query took ${Date.now() - start}ms`);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user.likedSongs);
  } catch (error) {
    next(error);
  }
};

export const setWalletPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const { userId } = req;

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be 4 digits" });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashedPin = await bcrypt.hash(pin, 10);
    user.walletPin = hashedPin;
    await user.save();

    res.status(200).json({ success: true, message: "PIN set successfully" });
  } catch (error) {
    next(error);
  }
};

export const verifyWalletPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const { userId } = req;

    const user = await User.findOne({ clerkId: userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.walletPin) {
      return res
        .status(400)
        .json({ verified: false, needsSetup: true, message: "PIN not set" });
    }

    const isValid = await bcrypt.compare(pin, user.walletPin);
    if (isValid) {
      return res.status(200).json({ verified: true });
    }

    return res.status(200).json({ verified: false });
  } catch (error) {
    next(error);
  }
};

export const getPinStatus = async (req, res, next) => {
  try {
    const { userId } = req;
    const user = await User.findOne({ clerkId: userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ hasPin: !!user.walletPin });
  } catch (error) {
    next(error);
  }
};
