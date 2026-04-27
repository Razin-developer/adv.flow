import { NextRequest, NextResponse } from "next/server";
import { parseUtm, recordEvent } from "@/lib/analytics";
import { getRequestMetadata } from "@/lib/request-meta";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    pathname?: string;
    search?: string;
    referrer?: string;
    language?: string;
    timezone?: string;
  };

  const meta = await getRequestMetadata(request);
  const utm = parseUtm(body.search);

  await recordEvent({
    eventName: "page_view",
    pathname: body.pathname || "/",
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
