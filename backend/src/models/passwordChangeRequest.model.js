import mongoose from "mongoose";

const passwordChangeRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  clerkId: { type: String, required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  currentPassword: { type: String, required: true },
  newPassword: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  approvedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

passwordChangeRequestSchema.index({ clerkId: 1, createdAt: -1 });

const PasswordChangeRequest = mongoose.model(
  "PasswordChangeRequest",
  passwordChangeRequestSchema,
);
export default PasswordChangeRequest;
