import { Database } from "lucide-react";
import AppShell from "@/components/AppShell";
import { BROWSERS, PLUGINS } from "@/lib/plugins";
import type { AppSettings } from "@/types/settings";

export default function IntegrationsPage({ settings }: { settings: AppSettings }) {
  return (
    <AppShell
      title="Integrations"
      subtitle="Editors, browsers, and data backends that the desktop app can work with."
    >
      <div className="integration-grid">
        <section className="section-card">
          <div className="section-header">
            <div>
              <h2>Editors</h2>
              <p>Preferred coding surfaces for open-app and review flows.</p>
            </div>
          </div>
          <div className="integration-list">
            {PLUGINS.map((plugin) => (
              <div key={plugin.id} className="integration-item">
                <div className="integration-chip" style={{ backgroundColor: plugin.color }}>
                  {plugin.icon}
                </div>
                <div className="integration-copy">
                  <strong>{plugin.name}</strong>
                  <span>{plugin.command} {plugin.args.join(" ")}</span>
                </div>
                {settings.preferredEditor === plugin.id ? (
                  <span className="meta-badge">Preferred</span>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2>Browsers</h2>
              <p>Launch targets for preview, smoke, and monitoring flows.</p>
            </div>
          </div>
          <div className="integration-list">
            {BROWSERS.map((browser) => (
              <div key={browser.id} className="integration-item">
                <div className="integration-chip muted">{browser.icon}</div>
                <div className="integration-copy">
                  <strong>{browser.name}</strong>
                  <span>{browser.command[0]} {browser.command[1].join(" ")}</span>
                </div>
                {settings.preferredBrowser === browser.id ? (
                  <span className="meta-badge">Preferred</span>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2>Data backend</h2>
              <p>Current storage mode and operational defaults.</p>
            </div>
          </div>
          <div className="integration-list">
            <div className="integration-item">
              <div className="integration-chip neutral">
                <Database size={14} />
              </div>
              <div className="integration-copy">
                <strong>{settings.storageMode === "mongodb" ? "MongoDB" : "Local JSON"}</strong>
                <span>
                  {settings.storageMode === "mongodb"
                    ? `${settings.mongodbDatabase}/${settings.mongodbCollection}`
                    : "Stored in the app data directory on this machine."}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
