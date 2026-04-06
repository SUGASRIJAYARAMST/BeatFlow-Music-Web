import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/user.model.js";
import { connectDB } from "../config/db.js";

dotenv.config();

const migratePreviousPassword = async () => {
  try {
    await connectDB();

    const users = await User.find({});
    let updated = 0;

    for (const user of users) {
      if (
        user.previousPassword === undefined ||
        user.previousPassword === null
      ) {
        user.previousPassword = user.currentPassword || null;
        await user.save();
        console.log(
          `Updated ${user.fullName} (${user.email}) - previousPassword: ${user.currentPassword ? "set" : "null"}`,
        );
        updated++;
      }
    }

    console.log(`\nMigration complete. Updated ${updated} users.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  }
};

migratePreviousPassword();
