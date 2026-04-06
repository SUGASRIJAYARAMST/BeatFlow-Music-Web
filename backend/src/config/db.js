import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    console.log("Using existing MongoDB connection");
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    isConnected = conn.connection.readyState === 1;
    console.log(`Connected to MongoDB: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      console.log("MongoDB connection error:", err);
      isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
      isConnected = false;
    });
  } catch (error) {
    console.log("Failed to connect MongoDB:", error);
    process.exit(1);
  }
};
