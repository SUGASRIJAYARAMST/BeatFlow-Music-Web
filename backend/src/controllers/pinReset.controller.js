import { PinResetRequest } from "../models/pinResetRequest.model.js";
import User from "../models/user.model.js";

export const requestPinReset = async (req, res) => {
  try {
    const clerkId = req.userId;

    const user = await User.findOne({ clerkId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existing = await PinResetRequest.findOne({
      clerkId,
      status: "pending",
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "You already have a pending PIN reset request" });
    }

    const bcrypt = await import("bcrypt");
    const hashedPin = await bcrypt.hash(req.body.newPin, 10);

    const request = await PinResetRequest.create({
      clerkId,
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      newPin: hashedPin,
    });

    // Broadcast event to notify admins of new PIN reset request
    global.broadcastEvent?.(
      "pin-reset-request",
      {
        id: request._id.toString(),
        userId: request.userId.toString(),
        clerkId: request.clerkId,
        fullName: request.fullName,
        email: request.email,
        createdAt: request.createdAt.toISOString(),
      },
      null,
    ); // null means broadcast to all users (admins will filter by their role)

    res
      .status(201)
      .json({ message: "PIN reset request sent to admin", request });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit PIN reset request" });
  }
};

export const getMyPinResetRequests = async (req, res) => {
  try {
    const requests = await PinResetRequest.find({ clerkId: req.userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch PIN reset requests" });
  }
};

export const getPinResetRequests = async (req, res) => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const requests = await PinResetRequest.find({
      status: "pending",
      createdAt: { $gt: threeDaysAgo },
    }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch PIN reset requests" });
  }
};

export const approvePinReset = async (req, res) => {
  try {
    const body = req.body || {};
    const newPin = body.newPin;

    const request = await PinResetRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending")
      return res.status(400).json({ message: "Request already processed" });

    console.log("Request userId:", request.userId);
    console.log("Request clerkId:", request.clerkId);

    const user = await User.findOne({ clerkId: request.clerkId });
    if (!user) return res.status(404).json({ message: "User not found" });

    let hashedPin;

    if (request.newPin && request.newPin.length > 0) {
      hashedPin = request.newPin;
    } else if (newPin && /^\d{4}$/.test(newPin)) {
      const bcrypt = await import("bcrypt");
      hashedPin = await bcrypt.hash(newPin, 10);
    } else {
      return res
        .status(400)
        .json({
          message:
            "No new PIN provided. User needs to resubmit PIN reset request.",
        });
    }

    user.walletPin = hashedPin;
    await user.save();

    request.status = "approved";
    request.approvedBy = req.userId;
    request.approvedAt = new Date();
    await request.save();

    global.broadcastEvent?.(
      "pin-reset-approved",
      { requestId: request._id },
      request.clerkId,
    );

    res.json({
      message: "PIN reset approved. User can now use their new PIN.",
    });
  } catch (error) {
    console.error("Approve PIN reset error:", error);
    res.status(500).json({ message: "Failed to approve PIN reset" });
  }
};

export const rejectPinReset = async (req, res) => {
  try {
    const request = await PinResetRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending")
      return res.status(400).json({ message: "Request already processed" });
    if (!request.clerkId)
      return res.status(400).json({ message: "Invalid request data" });

    request.status = "rejected";
    request.approvedBy = req.userId;
    request.approvedAt = new Date();
    await request.save();

    global.broadcastEvent?.(
      "pin-reset-rejected",
      { requestId: request._id },
      request.clerkId,
    );

    res.json({ message: "PIN reset request rejected" });
  } catch (error) {
    console.error("Reject PIN reset error:", error);
    res.status(500).json({ message: "Failed to reject PIN reset" });
  }
};
