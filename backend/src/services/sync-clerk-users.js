import dotenv from "dotenv";
dotenv.config();

import User from "../models/user.model.js";
import { connectDB } from "../config/db.js";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
  console.error("❌ CLERK_SECRET_KEY not found in .env");
  process.exit(1);
}

async function syncClerkUsers() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    let offset = 0;
    let totalSynced = 0;
    let totalCreated = 0;
    let totalUpdated = 0;

    while (true) {
      const response = await fetch(
        `https://api.clerk.com/v1/users?limit=100&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${CLERK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Clerk API error: ${response.status} ${response.statusText}`,
        );
      }

      const users = await response.json();

      if (users.length === 0) break;

      for (const clerkUser of users) {
        const email = clerkUser.email_addresses?.[0]?.email_address || "";
        const name =
          `${clerkUser.first_name || ""} ${clerkUser.last_name || ""}`.trim() ||
          "BeatFlow User";
        const imageUrl = clerkUser.image_url || "";
        const isAdmin = process.env.ADMIN_EMAIL === email;

        const existing = await User.findOne({ clerkId: clerkUser.id });

        if (existing) {
          existing.fullName = name;
          existing.imageUrl = imageUrl;
          existing.email = email;
          if (isAdmin && existing.role !== "admin") existing.role = "admin";
          await existing.save();
          totalUpdated++;
          console.log(`  ✏️  Updated: ${name} (${email})`);
        } else {
          await User.create({
            clerkId: clerkUser.id,
            fullName: name,
            imageUrl,
            email,
            role: isAdmin ? "admin" : "user",
          });
          totalCreated++;
          console.log(
            `  ✅ Created: ${name} (${email}) - Role: ${isAdmin ? "admin" : "user"}`,
          );
        }

        totalSynced++;
      }

      if (users.length < 100) break;
      offset += 100;
    }

    console.log("\n📊 Sync complete!");
    console.log(`   Total synced: ${totalSynced}`);
    console.log(`   Created: ${totalCreated}`);
    console.log(`   Updated: ${totalUpdated}`);

    const allUsers = await User.find({}).select("fullName email role clerkId");
    console.log("\n👥 Current DB users:");
    allUsers.forEach((u) =>
      console.log(`   - ${u.fullName} (${u.email}) [${u.role}]`),
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Sync failed:", error.message);
    process.exit(1);
  }
}

syncClerkUsers();
