import { clerkMiddleware } from "@clerk/express";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fileUpload from "express-fileupload";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import NodeCache from "node-cache";

import { connectDB } from "./config/db.js";
import {
  generalLimiter,
  authLimiter,
  paymentLimiter,
} from "./middleware/rateLimiter.js";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import songRoutes from "./routes/song.route.js";
import albumRoutes from "./routes/album.route.js";
import playlistRoutes from "./routes/playlist.route.js";
import paymentRoutes from "./routes/payment.route.js";
import adminRoutes from "./routes/admin.route.js";
import announcementRoutes from "./routes/announcement.route.js";
import downloadRoutes from "./routes/download.route.js";
import webhookRoutes from "./routes/webhook.route.js";
import notificationRoutes from "./routes/notification.route.js";
import walletRoutes from "./routes/wallet.route.js";
import sseRoutes, { broadcastEvent } from "./routes/sse.route.js";
import pinResetRoutes from "./routes/pinReset.route.js";
import feedbackRoutes from "./routes/feedback.route.js";
import { protectRoute, requireAdmin } from "./middleware/auth.middleware.js";
import {
  getPinResetRequests,
  approvePinReset,
  rejectPinReset,
} from "./controllers/pinReset.controller.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cache = new NodeCache({ stdTTL: 600, checkperiod: 300 });
global.cache = cache;
global.broadcastEvent = broadcastEvent;

const port = process.env.PORT || 5000;

const requiredEnvVars = [
  "MONGODB_URI",
  "CLERK_SECRET_KEY",
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_WEBHOOK_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CASHFREE_APP_ID",
  "CASHFREE_SECRET_KEY",
  "ENCRYPTION_KEY",
];
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(
    `FATAL: Missing required environment variables: ${missingVars.join(", ")}`,
  );
  process.exit(1);
}

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",")
  : [
      "https://beatflow-26.vercel.app",
      "beatflow-sugasrijayaramsts-projects.vercel.app",
      "http://localhost:3000"
    ];

const startServer = async () => {
  try {
    await connectDB();
    console.log("✅  Database connected successfully");
  } catch (error) {
    console.error("FATAL: Database connection failed. Server will not start.");
    console.error(error);
    process.exit(1);
  }

  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression({ level: 6 }));
  app.use(generalLimiter);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Cache-Control",
        "Pragma",
      ],
    }),
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(clerkMiddleware());

  app.use((req, res, next) => {
    if (req.path === "/api/admin/albums/with-songs" && req.method === "POST") {
      return next();
    }
    fileUpload({
      useTempFiles: true,
      tempFileDir: path.join(__dirname, "tmp"),
      createParentPath: true,
      limits: { fileSize: 1000 * 1024 * 1024 },
      abortOnLimit: true,
    })(req, res, next);
  });

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (duration > 2000) {
        console.log(
          `Slow request: ${req.method} ${req.url} took ${duration}ms`,
        );
      }
    });
    next();
  });

  app.get("/api/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/songs", songRoutes);
  app.use("/api/albums", albumRoutes);
  app.use("/api/playlists", playlistRoutes);
  app.use("/api/payments", paymentLimiter, paymentRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/announcements", announcementRoutes);
  app.use("/api/download", downloadRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/wallet", walletRoutes);
  app.use("/api/sse", sseRoutes);
  app.use("/api/pin-reset", pinResetRoutes);
  app.use("/api/feedback", feedbackRoutes);
  app.get(
    "/api/admin/pin-requests",
    protectRoute,
    requireAdmin,
    getPinResetRequests,
  );
  app.post(
    "/api/admin/pin-requests/:id/approve",
    protectRoute,
    requireAdmin,
    approvePinReset,
  );
  app.post(
    "/api/admin/pin-requests/:id/reject",
    protectRoute,
    requireAdmin,
    rejectPinReset,
  );

  app.use((err, req, res, next) => {
    console.error("Error:", err.stack);
    if (err.message === "Not allowed by CORS") {
      return res.status(403).json({ message: "CORS policy violation" });
    }
    res.status(err.status || 500).json({
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    });
  });

  app.listen(port, () => {
    console.log(`⚙️   Server running on port ${port}`);
  });
};

startServer();
