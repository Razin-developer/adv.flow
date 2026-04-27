import { Activity, Database, Download, Globe2, Mail, MonitorSmartphone, PanelsTopLeft, Radar } from "lucide-react";
import { databaseVersion, getDashboardData } from "@/lib/analytics";

export const dynamic = "force-dynamic";

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(2)}%`;
}

function maxValue(items: { total: number }[]) {
  return Math.max(...items.map((item) => item.total), 1);
}

export default async function AdminPage() {
  const data = await getDashboardData();
  const maxTraffic = maxValue(data.trafficByDay.map((item) => ({ total: item.visits })));
  const maxPlatform = maxValue(data.platforms);

  return (
    <main className="admin-shell">
      <section className="admin-hero">
        <div>
          <div className="eyebrow">
            <Database size={14} />
            ClickHouse analytics
          </div>
          <h1>Admin dashboard</h1>
          <p>
            Track traffic, downloads, lead capture, referrers, browsers, countries, and platform interest from one
            ClickHouse analytics pipeline with Mongo-backed download lead storage.
          </p>
        </div>
        <div className="admin-version">
          <strong>Backend</strong>
          <span>{databaseVersion()}</span>
        </div>
      </section>

      <section className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <span className="icon-badge"><Activity size={16} /></span>
          <small>Total visits</small>
          <strong>{data.overview.total_visits}</strong>
        </article>
        <article className="admin-kpi-card">
          <span className="icon-badge"><Radar size={16} /></span>
          <small>Unique visitors</small>
          <strong>{data.overview.unique_visitors}</strong>
        </article>
        <article className="admin-kpi-card">
          <span className="icon-badge"><Mail size={16} /></span>
          <small>Lead emails</small>
          <strong>{data.overview.total_leads}</strong>
        </article>
        <article className="admin-kpi-card">
          <span className="icon-badge"><Download size={16} /></span>
          <small>Download intent</small>
          <strong>{data.overview.total_downloads}</strong>
        </article>
        <article className="admin-kpi-card featured">
          <span className="icon-badge"><PanelsTopLeft size={16} /></span>
          <small>Lead conversion</small>
          <strong>{formatPercent(data.overview.lead_conversion_rate)}</strong>
        </article>
      </section>

      <section className="admin-grid two-up">
        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Traffic over time</h2>
              <p>Visits and leads for the last several days.</p>
            </div>
          </div>
          <div className="traffic-chart">
            {data.trafficByDay.length === 0 ? (
              <div className="empty-admin">No traffic recorded yet.</div>
            ) : (
              data.trafficByDay.map((item) => (
                <div key={item.event_day} className="traffic-bar-group">
                  <div className="traffic-bars">
                    <span
                      className="traffic-bar visits"
                      style={{ height: `${Math.max((item.visits / maxTraffic) * 100, item.visits ? 12 : 0)}%` }}
                    />
                    <span
                      className="traffic-bar leads"
                      style={{ height: `${Math.max((item.leads / maxTraffic) * 100, item.leads ? 12 : 0)}%` }}
                    />
                  </div>
                  <small>{item.event_day.slice(5)}</small>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Platform interest</h2>
              <p>Which operating systems visitors want to download.</p>
            </div>
          </div>
          <div className="breakdown-list">
            {data.platforms.length === 0 ? (
              <div className="empty-admin">No download leads yet.</div>
            ) : (
              data.platforms.map((item) => (
                <div key={item.label} className="breakdown-row">
                  <div className="breakdown-copy">
                    <strong>{item.label}</strong>
                    <span>{item.total} leads</span>
                  </div>
                  <div className="breakdown-meter">
                    <span style={{ width: `${(item.total / maxPlatform) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="admin-grid three-up">
        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Top traffic sources</h2>
              <p>Best source label from UTM or referrer.</p>
            </div>
          </div>
          <div className="simple-stack">
            {data.topSources.length === 0 ? <div className="empty-admin">No source data yet.</div> : data.topSources.map((item) => (
              <div key={item.label} className="simple-row">
                <span>{item.label}</span>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Top referrers</h2>
              <p>Where people came from before landing.</p>
            </div>
          </div>
          <div className="simple-stack">
            {data.topReferrers.length === 0 ? <div className="empty-admin">No referrer data yet.</div> : data.topReferrers.map((item) => (
              <div key={item.label} className="simple-row">
                <span>{item.label}</span>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Traffic by country</h2>
              <p>Based on available hosting headers.</p>
            </div>
          </div>
          <div className="simple-stack">
            {data.topCountries.length === 0 ? <div className="empty-admin">No country data yet.</div> : data.topCountries.map((item) => (
              <div key={item.label} className="simple-row">
                <span>{item.label}</span>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="admin-grid two-up">
        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Browsers</h2>
              <p>Traffic split by browser family.</p>
            </div>
          </div>
          <div className="simple-stack with-icons">
            {data.browsers.length === 0 ? <div className="empty-admin">No browser data yet.</div> : data.browsers.map((item) => (
              <div key={item.label} className="simple-row">
                <span><Globe2 size={14} /> {item.label}</span>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Operating systems</h2>
              <p>Traffic split by OS family.</p>
            </div>
          </div>
          <div className="simple-stack with-icons">
            {data.operatingSystems.length === 0 ? <div className="empty-admin">No OS data yet.</div> : data.operatingSystems.map((item) => (
              <div key={item.label} className="simple-row">
                <span><MonitorSmartphone size={14} /> {item.label}</span>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Latest download leads</h2>
            <p>Email captures from the download page. Only email is required before redirecting to download.</p>
          </div>
        </div>
        {data.latestLeads.length === 0 ? (
          <div className="empty-admin">No leads captured yet.</div>
        ) : (
          <>
            <div className="lead-table desktop-only">
              <div className="lead-table-row head">
                <span>Email</span>
                <span>Platform</span>
                <span>Source</span>
                <span>Country</span>
                <span>Browser / OS</span>
                <span>Time</span>
              </div>
              {data.latestLeads.map((lead) => (
                <div key={`${lead.email}-${lead.created_at}`} className="lead-table-row">
                  <span>{lead.email}</span>
                  <span>{lead.platform}</span>
                  <span>{lead.source}</span>
                  <span>{lead.country}</span>
                  <span>{lead.browser} / {lead.os}</span>
                  <span>{lead.created_at}</span>
                </div>
              ))}
            </div>
            <div className="lead-cards mobile-only">
              {data.latestLeads.map((lead) => (
                <article key={`${lead.email}-${lead.created_at}`} className="lead-card">
                  <div className="lead-card-head">
                    <strong>{lead.email}</strong>
                    <span>{lead.created_at}</span>
                  </div>
                  <div className="lead-card-grid">
                    <div>
                      <small>Platform</small>
                      <span>{lead.platform}</span>
                    </div>
                    <div>
                      <small>Source</small>
                      <span>{lead.source}</span>
                    </div>
                    <div>
                      <small>Country</small>
                      <span>{lead.country}</span>
                    </div>
                    <div>
                      <small>Browser / OS</small>
                      <span>{lead.browser} / {lead.os}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
