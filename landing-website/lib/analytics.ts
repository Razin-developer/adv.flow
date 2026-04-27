import { createHash, randomUUID } from "node:crypto";
import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { getLatestDownloadLeads } from "@/lib/download-leads";

export type AnalyticsEventInput = {
  eventName: "page_view" | "download_lead";
  pathname: string;
  platform?: string | null;
  email?: string | null;
  referrer?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  language?: string | null;
  timezone?: string | null;
  userAgent?: string | null;
  browser?: string | null;
  os?: string | null;
  deviceType?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  ipHash?: string | null;
};

type OverviewRow = {
  total_visits: number;
  unique_visitors: number;
  total_leads: number;
  total_downloads: number;
  lead_conversion_rate: number;
};

type TimeseriesRow = {
  event_day: string;
  visits: number;
  leads: number;
};

type BreakdownRow = {
  label: string;
  total: number;
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

type DashboardData = {
  overview: OverviewRow;
  trafficByDay: TimeseriesRow[];
  topSources: BreakdownRow[];
  topReferrers: BreakdownRow[];
  topCountries: BreakdownRow[];
  platforms: BreakdownRow[];
  browsers: BreakdownRow[];
  operatingSystems: BreakdownRow[];
  latestLeads: LeadRow[];
};

declare global {
  // eslint-disable-next-line no-var
  var __advflowClickHouseClient: ClickHouseClient | undefined;
  // eslint-disable-next-line no-var
  var __advflowClickHouseReady: Promise<void> | undefined;
}

const defaultOverview: OverviewRow = {
  total_visits: 0,
  unique_visitors: 0,
  total_leads: 0,
  total_downloads: 0,
  lead_conversion_rate: 0,
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeLabel(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function getReferrerHost(referrer: string | null | undefined) {
  if (!referrer) return "Direct";
  try {
    return new URL(referrer).host || "Direct";
  } catch {
    return "Direct";
  }
}

function hasClickHouseConfig() {
  return Boolean(process.env.CLICKHOUSE_URL);
}

function getClickHouseClient() {
  if (!process.env.CLICKHOUSE_URL) {
    return null;
  }

  if (!global.__advflowClickHouseClient) {
    global.__advflowClickHouseClient = createClient({
      url: process.env.CLICKHOUSE_URL,
      username: process.env.CLICKHOUSE_USERNAME,
      password: process.env.CLICKHOUSE_PASSWORD,
      database: process.env.CLICKHOUSE_DATABASE,
    });
  }

  return global.__advflowClickHouseClient;
}

async function ensureAnalyticsTable() {
  const client = getClickHouseClient();
  if (!client) {
    return;
  }

  if (!global.__advflowClickHouseReady) {
    global.__advflowClickHouseReady = client.command({
      query: `
        CREATE TABLE IF NOT EXISTS analytics_events (
          id String,
          created_at DateTime64(3, 'UTC'),
          event_name LowCardinality(String),
          pathname String,
          platform Nullable(String),
          email Nullable(String),
          referrer Nullable(String),
          referrer_host String,
          source String,
          medium String,
          campaign String,
          user_agent Nullable(String),
          browser String,
          os String,
          device_type String,
          language String,
          timezone String,
          country String,
          region String,
          city String,
          ip_hash Nullable(String)
        )
        ENGINE = MergeTree
        ORDER BY (event_name, created_at, id)
      `,
    }).then(() => undefined);
  }

  await global.__advflowClickHouseReady;
}

function toAnalyticsRow(input: AnalyticsEventInput) {
  return {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    event_name: input.eventName,
    pathname: input.pathname,
    platform: input.platform ?? null,
    email: input.email ?? null,
    referrer: input.referrer ?? null,
    referrer_host: getReferrerHost(input.referrer),
    source: normalizeLabel(input.source, "Direct"),
    medium: normalizeLabel(input.medium, "Unknown"),
    campaign: normalizeLabel(input.campaign, "None"),
    user_agent: input.userAgent ?? null,
    browser: normalizeLabel(input.browser, "Unknown"),
    os: normalizeLabel(input.os, "Unknown"),
    device_type: normalizeLabel(input.deviceType, "desktop"),
    language: normalizeLabel(input.language, "Unknown"),
    timezone: normalizeLabel(input.timezone, "Unknown"),
    country: normalizeLabel(input.country, "Unknown"),
    region: normalizeLabel(input.region, "Unknown"),
    city: normalizeLabel(input.city, "Unknown"),
    ip_hash: input.ipHash ?? null,
  };
}

async function queryRows<T>(query: string) {
  const client = getClickHouseClient();
  if (!client) {
    return [] as T[];
  }

  await ensureAnalyticsTable();
  const result = await client.query({
    query,
    format: "JSONEachRow",
  });

  return result.json<T>();
}

export async function recordEvent(input: AnalyticsEventInput) {
  const client = getClickHouseClient();
  if (!client) {
    return;
  }

  await ensureAnalyticsTable();
  await client.insert({
    table: "analytics_events",
    values: [toAnalyticsRow(input)],
    format: "JSONEachRow",
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!hasClickHouseConfig()) {
    return {
      overview: defaultOverview,
      trafficByDay: [],
      topSources: [],
      topReferrers: [],
      topCountries: [],
      platforms: [],
      browsers: [],
      operatingSystems: [],
      latestLeads: await getLatestDownloadLeads(),
    };
  }

  const [overviewRows, trafficByDay, topSources, topReferrers, topCountries, platforms, browsers, operatingSystems, latestLeads] =
    await Promise.all([
      queryRows<OverviewRow>(`
        SELECT
          countIf(event_name = 'page_view') AS total_visits,
          uniqExactIf(ip_hash, event_name = 'page_view' AND ip_hash IS NOT NULL) AS unique_visitors,
          countIf(event_name = 'download_lead') AS total_leads,
          countIf(event_name = 'download_lead' AND platform IS NOT NULL) AS total_downloads,
          round(if(countIf(event_name = 'page_view') = 0, 0, (countIf(event_name = 'download_lead') / countIf(event_name = 'page_view')) * 100), 2) AS lead_conversion_rate
        FROM analytics_events
      `),
      queryRows<TimeseriesRow>(`
        SELECT
          formatDateTime(toDate(created_at), '%Y-%m-%d') AS event_day,
          countIf(event_name = 'page_view') AS visits,
          countIf(event_name = 'download_lead') AS leads
        FROM analytics_events
        WHERE created_at >= now() - INTERVAL 6 DAY
        GROUP BY event_day
        ORDER BY event_day ASC
      `),
      queryRows<BreakdownRow>(`
        SELECT source AS label, count() AS total
        FROM analytics_events
        WHERE event_name = 'page_view'
        GROUP BY label
        ORDER BY total DESC, label ASC
        LIMIT 6
      `),
      queryRows<BreakdownRow>(`
        SELECT referrer_host AS label, count() AS total
        FROM analytics_events
        WHERE event_name = 'page_view'
        GROUP BY label
        ORDER BY total DESC, label ASC
        LIMIT 6
      `),
      queryRows<BreakdownRow>(`
        SELECT country AS label, count() AS total
        FROM analytics_events
        WHERE event_name = 'page_view'
        GROUP BY label
        ORDER BY total DESC, label ASC
        LIMIT 6
      `),
      queryRows<BreakdownRow>(`
        SELECT coalesce(platform, 'Unknown') AS label, count() AS total
        FROM analytics_events
        WHERE event_name = 'download_lead'
        GROUP BY label
        ORDER BY total DESC, label ASC
        LIMIT 6
      `),
      queryRows<BreakdownRow>(`
        SELECT browser AS label, count() AS total
        FROM analytics_events
        WHERE event_name = 'page_view'
        GROUP BY label
        ORDER BY total DESC, label ASC
        LIMIT 6
      `),
      queryRows<BreakdownRow>(`
        SELECT os AS label, count() AS total
        FROM analytics_events
        WHERE event_name = 'page_view'
        GROUP BY label
        ORDER BY total DESC, label ASC
        LIMIT 6
      `),
      getLatestDownloadLeads(),
    ]);

  return {
    overview: overviewRows[0] ?? defaultOverview,
    trafficByDay,
    topSources,
    topReferrers,
    topCountries,
    platforms,
    browsers,
    operatingSystems,
    latestLeads,
  };
}

export function extractSource(referrer?: string | null) {
  if (!referrer) return "Direct";
  try {
    return new URL(referrer).host || "Direct";
  } catch {
    return "Direct";
  }
}

export function hashIp(ip?: string | null) {
  if (!ip) return null;
  return sha256(ip);
}

export function parseUtm(search?: string | null) {
  const params = new URLSearchParams(search ?? "");
  return {
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaign: params.get("utm_campaign"),
  };
}

export function databaseVersion() {
  return hasClickHouseConfig() ? "ClickHouse analytics + MongoDB leads" : "Missing ClickHouse config";
}
