import { Router } from "express";
import { verifyToken } from "@clerk/backend";
import User from "../models/user.model.js";

const router = Router();

const clients = new Map();
const MAX_CONNECTIONS = 1000;
const CONNECTION_TIMEOUT = 5 * 60 * 1000;

const sseAuth = async (req, res, next) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const session = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      audience: process.env.CLERK_PUBLISHABLE_KEY,
    });

    if (!session || !session.sub) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.userId = session.sub;
    const user = await User.findOne({ clerkId: session.sub });
    req.user = user;
    next();
  } catch (error) {
    console.error("SSE Auth Error:", error.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

router.get("/events", sseAuth, (req, res) => {
  if (clients.size >= MAX_CONNECTIONS) {
    return res.status(429).json({ message: "Too many connections" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const clientId = `${req.userId}_${Date.now()}`;
  const newClient = {
    id: clientId,
    res,
    userId: req.userId,
    connectedAt: Date.now(),
  };
  clients.set(clientId, newClient);

  const timeout = setTimeout(() => {
    clients.delete(clientId);
    res.end();
  }, CONNECTION_TIMEOUT);

  req.on("close", () => {
    clearTimeout(timeout);
    clients.delete(clientId);
  });
});

export const broadcastEvent = (event, data, targetUserId = null) => {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const [clientId, client] of clients) {
    if (targetUserId && client.userId !== targetUserId) continue;
    try {
      client.res.write(message);
    } catch (error) {
      clients.delete(clientId);
    }
  }
};

export { clients };
export default router;
