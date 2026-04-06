import { Router } from "express";
import { clerkWebhook } from "../controllers/webhook.controller.js";

const router = Router();

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || "utf8");
  }
};

router.post(
  "/clerk",
  (req, res, next) => {
    rawBodyBuffer(req, res, req.body, "utf8");
    next();
  },
  clerkWebhook,
);

export default router;
