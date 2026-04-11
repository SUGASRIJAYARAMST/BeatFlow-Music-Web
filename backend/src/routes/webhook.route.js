import { Router } from "express";
import express from "express";
import { clerkWebhook } from "../controllers/webhook.controller.js";

const router = Router();

// Middleware to capture raw body for webhook signature verification
// Must be applied BEFORE express.json() parsing
const captureRawBody = express.raw(
  { type: 'application/json' },
  (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  }
);

router.post(
  "/clerk",
  captureRawBody,
  (req, res, next) => {
    // Parse the raw body to JSON for controller to use
    if (req.rawBody) {
      try {
        req.body = JSON.parse(req.rawBody);
      } catch (e) {
        return res.status(400).json({ message: "Invalid JSON" });
      }
    }
    next();
  },
  clerkWebhook,
);

export default router;
