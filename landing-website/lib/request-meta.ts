import type { NextRequest } from "next/server";
import { UAParser } from "ua-parser-js";
import { extractSource, hashIp } from "./analytics";

export async function getIpLocation(ip: string | null) {
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) return null;
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();
    console.log(data);

    if (!data.error) {
      return {
        country: data.country_code,
        region: data.region,
        city: data.city,
      };
    }
  } catch (error) {
    console.error("Failed to fetch location:", error);
  }
  return null;
}

export async function getRequestMetadata(request: NextRequest) {
  const userAgent = request.headers.get("user-agent");
  const parser = userAgent ? new UAParser(userAgent) : null;
  const result = parser?.getResult();
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || null;
  const referrer = request.headers.get("referer");

  let country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || null;
  let region = request.headers.get("x-vercel-ip-country-region") || null;
  let city = request.headers.get("x-vercel-ip-city") || null;

  if (!country && ip) {
    const location = await getIpLocation(ip);
    if (location) {
      country = location.country;
      region = location.region;
      city = location.city;
    }
  }

  return {
    userAgent,
    browser: result?.browser.name ?? null,
    os: result?.os.name ?? null,
    deviceType: result?.device.type ?? "desktop",
    referrer,
    source: extractSource(referrer),
    country,
    region,
    city,
    ipHash: hashIp(ip),
  };
}
