import { NextRequest, NextResponse } from "next/server";
import { saveDownloadLead } from "@/lib/download-leads";
import { parseUtm, recordEvent } from "@/lib/analytics";
import { getRequestMetadata } from "@/lib/request-meta";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    platform?: string;
    pathname?: string;
    search?: string;
    referrer?: string;
    language?: string;
    timezone?: string;
  };

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const meta = await getRequestMetadata(request);
  const utm = parseUtm(body.search);
  const email = body.email.trim().toLowerCase();

  await saveDownloadLead({
    email,
    platform: body.platform ?? null,
    pathname: body.pathname || "/download",
    source: utm.source || meta.source,
    referrer: body.referrer || meta.referrer,
    country: meta.country,
    region: meta.region,
    city: meta.city,
    browser: meta.browser,
    os: meta.os,
    deviceType: meta.deviceType,
    language: body.language ?? null,
    timezone: body.timezone ?? null,
    ipHash: meta.ipHash,
  });

  await recordEvent({
    eventName: "download_lead",
    pathname: body.pathname || "/download",
    platform: body.platform ?? null,
    email,
    referrer: body.referrer || meta.referrer,
    source: utm.source || meta.source,
    medium: utm.medium,
    campaign: utm.campaign,
    language: body.language ?? null,
    timezone: body.timezone ?? null,
    userAgent: meta.userAgent,
    browser: meta.browser,
    os: meta.os,
    deviceType: meta.deviceType,
    country: meta.country,
    region: meta.region,
    city: meta.city,
    ipHash: meta.ipHash,
  });

  return NextResponse.json({ ok: true });
}
