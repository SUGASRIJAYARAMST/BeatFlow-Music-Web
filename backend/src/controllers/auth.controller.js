import User from "../models/user.model.js";

export const authCallback = async (req, res, next) => {
  try {
    const { id, firstName, lastName, imageUrl, primaryEmail } = req.body;
    const name =
      [firstName, lastName].filter(Boolean).join(" ") || "BeatFlow User";

    // Provide a default image URL if none is provided
    const finalImageUrl =
      imageUrl && imageUrl.trim() !== ""
        ? imageUrl
        : "https://ui-avatars.com/api/?name=" +
          encodeURIComponent(name) +
          "&background=random";

    let user = await User.findOne({ clerkId: id });
    const isAdmin = process.env.ADMIN_EMAIL === primaryEmail;

    if (!user) {
      user = await User.create({
        clerkId: id,
        fullName: name,
        imageUrl: finalImageUrl,
        email: primaryEmail,
        role: isAdmin ? "admin" : "user",
        isPremium: isAdmin,
      });
      console.log(
        `New user created: ${name} (${primaryEmail}) - Role: ${user.role} - Premium: ${isAdmin}`,
      );
    } else {
      // Update existing user metadata if changed
      let hasChanged = false;
      if (user.fullName !== name) {
        user.fullName = name;
        hasChanged = true;
      }
      if (user.imageUrl !== finalImageUrl) {
        user.imageUrl = finalImageUrl;
        hasChanged = true;
      }
      if (user.email !== primaryEmail) {
        user.email = primaryEmail;
        hasChanged = true;
      }

      if (isAdmin && user.role !== "admin") {
        user.role = "admin";
        hasChanged = true;
        console.log(`Upgraded to admin: ${primaryEmail}`);
      }
      if (isAdmin && !user.isPremium) {
        user.isPremium = true;
        hasChanged = true;
        console.log(`Admin premium granted: ${primaryEmail}`);
      }

      if (hasChanged) await user.save();
      console.log(
        `Existing user sync: ${user.fullName} (${user.clerkId}) - Role: ${user.role} - Premium: ${user.isPremium}`,
      );
    }
    res
      .status(200)
      .json({
        success: true,
        user: {
          fullName: user.fullName,
          imageUrl: user.imageUrl,
          email: user.email,
          clerkId: user.clerkId,
          role: user.role,
        },
      });
  } catch (error) {
    console.log("Error in auth callback", error);
    next(error);
  }
};

export const checkAdmin = async (req, res, next) => {
  try {
    const start = Date.now();
    const { userId } = req;
    const user = await User.findOne({ clerkId: userId });
    console.log(`checkAdmin query took ${Date.now() - start}ms`);
    res.status(200).json({ admin: user?.role === "admin" });
  } catch (error) {
    console.log("Error checking admin", error);
    next(error);
  }
};
