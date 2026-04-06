import { Router } from "express";
import {
  getAllAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcement.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
import {
  validate,
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "../middleware/validation.js";

const router = Router();
router.get("/", getAllAnnouncements);
router.get("/active", getActiveAnnouncements);
router.post(
  "/",
  protectRoute,
  requireAdmin,
  validate(createAnnouncementSchema),
  createAnnouncement,
);
router.put(
  "/:id",
  protectRoute,
  requireAdmin,
  validate(updateAnnouncementSchema),
  updateAnnouncement,
);
router.delete("/:id", protectRoute, requireAdmin, deleteAnnouncement);

export default router;
