import { Offer } from "../models/offer.model.js";

export const getOffer = async (req, res) => {
  try {
    const offer = await Offer.findOne().sort({ createdAt: -1 });
    res.json(offer || { discount: 0, planId: null, active: false });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch offer" });
  }
};

export const saveOffer = async (req, res) => {
  try {
    const { discount, planId, active } = req.body;

    const existing = await Offer.findOne();
    if (existing) {
      existing.discount = Number(discount) || 0;
      existing.planId = planId || null;
      existing.active = Boolean(active);
      await existing.save();
      return res.json(existing);
    }

    const offer = await Offer.create({
      discount: Number(discount) || 0,
      planId: planId || null,
      active: Boolean(active),
    });
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: "Failed to save offer" });
  }
};

export const getCurrentOffer = async () => {
  try {
    const offer = await Offer.findOne().sort({ createdAt: -1 });
    return offer || { discount: 0, planId: null, active: false };
  } catch {
    return { discount: 0, planId: null, active: false };
  }
};
