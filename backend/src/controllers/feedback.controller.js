import User from "../models/user.model.js";
import { Feedback } from "../models/feedback.model.js";
import Notification from "../models/notification.model.js";

export const createFeedback = async (req, res, next) => {
  try {
    const { rating, feedback } = req.body;
    const { userId: clerkId } = req;

    if (!rating || !feedback) {
      return res.status(400).json({ message: "Rating and feedback are required" });
    }

    const user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const newFeedback = await Feedback.create({
      userId: user._id,
      clerkId,
      rating,
      feedback,
    });

    res.status(201).json({ message: "Feedback submitted successfully", feedback: newFeedback });
  } catch (error) {
    next(error);
  }
};

export const getUserFeedback = async (req, res, next) => {
  try {
    const { userId: clerkId } = req;
    const feedbacks = await Feedback.find({ clerkId }).sort({ createdAt: -1 }).limit(10);
    res.status(200).json(feedbacks);
  } catch (error) {
    next(error);
  }
};

export const getAllFeedback = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("userId", "fullName email")
      .sort({ createdAt: -1 });
    
    const formatted = feedbacks.map(f => ({
      _id: f._id,
      userName: f.userId?.fullName || "Unknown",
      userEmail: f.userId?.email || "Unknown",
      rating: f.rating,
      feedback: f.feedback,
      reply: f.reply,
      replyAt: f.replyAt,
      createdAt: f.createdAt,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const replyToFeedback = async (req, res, next) => {
  try {
    const { feedbackId } = req.params;
    const { reply } = req.body;

    if (!reply) {
      return res.status(400).json({ message: "Reply is required" });
    }

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    feedback.reply = reply;
    feedback.replyAt = new Date();
    await feedback.save();

    const notification = new Notification({
      userId: feedback.userId,
      clerkId: feedback.clerkId,
      title: "Feedback Reply",
      message: `Admin replied to your feedback: "${reply}"`,
      type: "success",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await notification.save();

    global.broadcastEvent?.(
      "feedback-reply",
      {
        id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        createdAt: notification.createdAt.toISOString(),
      },
      feedback.clerkId,
    );

    res.status(200).json({ message: "Reply sent successfully" });
  } catch (error) {
    next(error);
  }
};