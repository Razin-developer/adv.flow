import { connectToMongo } from "@/lib/mongoose";
import { DownloadLead } from "@/models/DownloadLead";

type SaveDownloadLeadInput = {
  email: string;
  platform?: string | null;
  pathname?: string | null;
  source?: string | null;
  referrer?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  browser?: string | null;
  os?: string | null;
  deviceType?: string | null;
  language?: string | null;
  timezone?: string | null;
  ipHash?: string | null;
};

type LeadRow = {
  created_at: string;
  email: string;
  platform: string;
  source: string;
  country: string;
  browser: string;
  os: string;
};

function normalize(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export async function saveDownloadLead(input: SaveDownloadLeadInput) {
  await connectToMongo();

  await DownloadLead.create({
    email: input.email.trim().toLowerCase(),
    platform: normalize(input.platform, "Unknown"),
    pathname: normalize(input.pathname, "/download"),
    source: normalize(input.source, "Direct"),
    referrer: input.referrer ?? "",
    country: normalize(input.country, "Unknown"),
    region: normalize(input.region, "Unknown"),
    city: normalize(input.city, "Unknown"),
    browser: normalize(input.browser, "Unknown"),
    os: normalize(input.os, "Unknown"),
    deviceType: normalize(input.deviceType, "desktop"),
    language: normalize(input.language, "Unknown"),
    timezone: normalize(input.timezone, "Unknown"),
    ipHash: input.ipHash ?? null,
  });
}

export async function getLatestDownloadLeads(): Promise<LeadRow[]> {
  if (!process.env.MONGODB_URI) {
    return [];
  }

  await connectToMongo();

  const leads = await DownloadLead.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .lean<{
      email: string;
      platform?: string;
      source?: string;
      country?: string;
      browser?: string;
      os?: string;
      createdAt?: Date;
    }[]>();

  return leads.map((lead) => ({
    created_at: lead.createdAt ? `${lead.createdAt.toISOString().slice(0, 10)} ${lead.createdAt.toISOString().slice(11, 16)}` : "",
    email: lead.email,
    platform: lead.platform ?? "Unknown",
    source: lead.source ?? "Direct",
    country: lead.country ?? "Unknown",
    browser: lead.browser ?? "Unknown",
    os: lead.os ?? "Unknown",
  }));
}
