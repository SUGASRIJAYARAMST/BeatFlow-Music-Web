import { Announcement } from "../models/announcement.model.js";

export const getAllAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(announcements);
  } catch (error) {
    next(error);
  }
};

export const getActiveAnnouncements = async (req, res, next) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(announcements);
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, type, expiresAt } = req.body;
    const announcement = new Announcement({
      title,
      content,
      type: type || "info",
      expiresAt: expiresAt || null,
    });
    await announcement.save();
    res.status(201).json({ message: "Announcement created", announcement });
  } catch (error) {
    next(error);
  }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    if (!announcement)
      return res.status(404).json({ message: "Announcement not found" });
    res.status(200).json({ message: "Announcement updated", announcement });
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement)
      return res.status(404).json({ message: "Announcement not found" });
    res.status(200).json({ message: "Announcement deleted" });
  } catch (error) {
    next(error);
  }
};
