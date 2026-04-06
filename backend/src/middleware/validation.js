import { z } from "zod";

export const createSongSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
  genre: z.string().max(100).optional(),
  duration: z.string().or(z.number()).optional(),
  albumId: z.string().optional(),
  isFeatured: z.string().or(z.boolean()).optional(),
  isTrending: z.string().or(z.boolean()).optional(),
  isPremium: z.string().or(z.boolean()).optional(),
});

export const updateSongSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  artist: z.string().min(1).max(200).optional(),
  genre: z.string().max(100).optional(),
  duration: z.number().positive().optional(),
  isFeatured: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isPremium: z.boolean().optional(),
});

export const createAlbumSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
  genre: z.string().max(100).optional(),
  releaseYear: z.string().or(z.number()).optional(),
});

export const createPlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  organizationType: z.enum(["list", "tree", "genre", "artist"]).optional(),
});

export const updatePlaylistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  organizationType: z.enum(["list", "tree", "genre", "artist"]).optional(),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  type: z.enum(["info", "update", "maintenance", "promotion"]).optional(),
  expiresAt: z.string().datetime().optional().or(z.null()),
});

export const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(2000).optional(),
  type: z.enum(["info", "update", "maintenance", "promotion"]).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().or(z.null()),
});

export const createOrderSchema = z.object({
  plan: z.enum(["daily", "monthly", "yearly"]),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
});

export const searchSchema = z.object({
  query: z.string().min(1).max(200),
});

export const paginationSchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
});

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      message: "Validation error",
      errors: error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }
};
