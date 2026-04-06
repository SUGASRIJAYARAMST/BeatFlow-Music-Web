import { Webhook } from "svix";
import User from "../models/user.model.js";

export const clerkWebhook = async (req, res) => {
  try {
    const payload = req.rawBody || JSON.stringify(req.body);
    const headers = req.headers;

    const svix_id = headers["svix-id"];
    const svix_timestamp = headers["svix-timestamp"];
    const svix_signature = headers["svix-signature"];

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: "Missing svix headers" });
    }

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    let evt;
    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("[Webhook] Signature verification failed:", err.message);
      return res.status(400).json({ error: "Invalid signature" });
    }

    const eventType = evt.type;
    const data = evt.data;

    switch (eventType) {
      case "user.created": {
        const email = data.email_addresses?.[0]?.email_address || "";
        const name =
          `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
          "BeatFlow User";
        const imageUrl = data.image_url || "";
        const isAdmin = process.env.ADMIN_EMAIL === email;

        await User.create({
          clerkId: data.id,
          fullName: name,
          imageUrl,
          email,
          role: isAdmin ? "admin" : "user",
          isPremium: isAdmin,
        });

        console.log(
          `[Webhook] User created: ${name} (${email}) - Role: ${isAdmin ? "admin" : "user"} - Premium: ${isAdmin}`,
        );
        break;
      }

      case "user.updated": {
        const email = data.email_addresses?.[0]?.email_address || "";
        const name =
          `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
          "BeatFlow User";
        const imageUrl = data.image_url || "";
        const isAdmin = process.env.ADMIN_EMAIL === email;

        const user = await User.findOne({ clerkId: data.id });

        if (user) {
          user.fullName = name;
          user.imageUrl = imageUrl;
          user.email = email;
          if (isAdmin && user.role !== "admin") user.role = "admin";
          if (isAdmin && !user.isPremium) user.isPremium = true;
          await user.save();
          console.log(`[Webhook] User updated: ${name} (${email})`);
        } else {
          await User.create({
            clerkId: data.id,
            fullName: name,
            imageUrl,
            email,
            role: isAdmin ? "admin" : "user",
            isPremium: isAdmin,
          });
          console.log(
            `[Webhook] User updated but not found in DB, created: ${name} (${email})`,
          );
        }
        break;
      }

      case "user.deleted": {
        if (data.id) {
          await User.findOneAndDelete({ clerkId: data.id });
          console.log(`[Webhook] User deleted: ${data.id}`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
