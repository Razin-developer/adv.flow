import { Schema, model, models } from "mongoose";

const DownloadLeadSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    platform: {
      type: String,
      default: "Unknown",
    },
    pathname: {
      type: String,
      default: "/download",
    },
    source: {
      type: String,
      default: "Direct",
    },
    referrer: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "Unknown",
    },
    region: {
      type: String,
      default: "Unknown",
    },
    city: {
      type: String,
      default: "Unknown",
    },
    browser: {
      type: String,
      default: "Unknown",
    },
    os: {
      type: String,
      default: "Unknown",
    },
    deviceType: {
      type: String,
      default: "desktop",
    },
    language: {
      type: String,
      default: "Unknown",
    },
    timezone: {
      type: String,
      default: "Unknown",
    },
    ipHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const DownloadLead = models.DownloadLead || model("DownloadLead", DownloadLeadSchema);
