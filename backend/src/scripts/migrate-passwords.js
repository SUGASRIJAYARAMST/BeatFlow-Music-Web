import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/user.model.js";
import { connectDB } from "../config/db.js";

dotenv.config();

const migratePasswords = async () => {
  try {
    await connectDB();

    const users = await User.find({});
    let updated = 0;

    for (const user of users) {
      if (user.currentPassword && !user.previousPassword) {
        user.previousPassword = user.currentPassword;
        await user.save();
        console.log(`Updated ${user.fullName} (${user.email})`);
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

migratePasswords();
