import { Schema, model, models } from "mongoose";

const CommunityCommentSchema = new Schema(
  {
    author: { type: String, required: true, trim: true },
    avatar: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    score: { type: Number, default: 1 },
    replies: { type: Array, default: [] },
  },
  {
    timestamps: true,
  },
);

const CommunityPostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    tag: {
      type: String,
      enum: ["Workflows", "Macros", "Bugs", "Ideas", "Showcase"],
      required: true,
      index: true,
    },
    author: { type: String, required: true, trim: true },
    avatar: { type: String, required: true, trim: true },
    score: { type: Number, default: 1, index: true },
    media: { type: String, default: "" },
    relatedDocs: { type: [String], default: [] },
    relatedFeatures: { type: [String], default: [] },
    comments: { type: [CommunityCommentSchema], default: [] },
  },
  {
    timestamps: true,
  },
);

CommunityPostSchema.index({ title: "text", description: "text", tag: "text" });

export const CommunityPost = models.CommunityPost || model("CommunityPost", CommunityPostSchema);

