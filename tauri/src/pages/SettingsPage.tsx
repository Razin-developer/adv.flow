import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Save } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAppDialog } from "@/components/AppDialog";
import { BROWSERS, PLUGINS } from "@/lib/plugins";
import type { AppSettings } from "@/types/settings";

export default function SettingsPage({
  settings,
  onSaveSettings,
  onTestMongo,
  onSyncLocalToMongo,
  onSyncMongoToLocal,
}: {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onTestMongo: () => Promise<string>;
  onSyncLocalToMongo: () => Promise<string>;
  onSyncMongoToLocal: () => Promise<string>;
}) {
  const dialog = useAppDialog();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "save" | "test" | "push" | "pull">(null);
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [loadingLocalModels, setLoadingLocalModels] = useState(false);

  useEffect(() => {
    setDraft(settings);
    setLocalModels(settings.localModelName ? [settings.localModelName] : []);
  }, [settings]);

  const setField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  async function runAction(kind: "save" | "test" | "push" | "pull", action: () => Promise<string | void>) {
    setBusy(kind);
    try {
      const result = await action();
      const message = typeof result === "string" ? result : "Done.";
      setStatus(message);
      await dialog.success(kind === "save" ? "Settings saved" : "Action complete", message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
      await dialog.error("Action failed", message);
    } finally {
      setBusy(null);
    }
  }

  async function loadLocalModels() {
    setLoadingLocalModels(true);
    try {
      const models = await invoke<string[]>("list_local_models", {
        endpoint: draft.localModelEndpoint || null,
        apiKey: draft.localModelApiKey || null,
      });
      setLocalModels(models);
      if (!draft.localModelName && models[0]) {
        setField("localModelName", models[0]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
      await dialog.error("Could not load local models", message);
    } finally {
      setLoadingLocalModels(false);
    }
  }

  return (
    <AppShell
      title="Settings"
      subtitle="Tune storage, interface density, execution defaults, and integration preferences."
      actions={
        <button
          className="primary-button"
          type="button"
          onClick={() => void runAction("save", async () => {
            await onSaveSettings(draft);
            return "Settings saved.";
          })}
        >
          <Save size={14} />
          {busy === "save" ? "Saving..." : "Save settings"}
        </button>
      }
    >
      {status ? <div className="status-banner">{status}</div> : null}

      <div className="settings-grid">
        <section className="section-card">
          <div className="section-header">
            <div>
              <h2>Data & sync</h2>
              <p>Choose local or Mongo-backed storage, then test and sync.</p>
            </div>
          </div>

          <label className="setting-field">
            <span>Storage mode</span>
            <select
              value={draft.storageMode}
              onChange={(event) => setField("storageMode", event.target.value as AppSettings["storageMode"])}
            >
              <option value="local">Local JSON</option>
              <option value="mongodb">MongoDB</option>
            </select>
          </label>

          <label className="setting-field">
            <span>MongoDB URI</span>
            <input
              value={draft.mongodbUri}
              placeholder="mongodb+srv://..."
              onChange={(event) => setField("mongodbUri", event.target.value)}
            />
          </label>

          <div className="setting-row three">
            <label className="setting-field">
              <span>Database</span>
              <input
                value={draft.mongodbDatabase}
                onChange={(event) => setField("mongodbDatabase", event.target.value)}
              />
            </label>
            <label className="setting-field">
              <span>Collection</span>
              <input
                value={draft.mongodbCollection}
                onChange={(event) => setField("mongodbCollection", event.target.value)}
              />
            </label>
            <label className="toggle-card">
              <div>
                <strong>Sync on open</strong>
                <span>Pull remote workflows when the app starts.</span>
              </div>
              <input
                type="checkbox"
                checked={draft.syncOnOpen}
                onChange={(event) => setField("syncOnOpen", event.target.checked)}
              />
            </label>
          </div>

          <div className="settings-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={() => void runAction("test", onTestMongo)}
            >
              {busy === "test" ? "Testing..." : "Test MongoDB"}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void runAction("push", onSyncLocalToMongo)}
            >
              {busy === "push" ? "Syncing..." : "Push local to Mongo"}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void runAction("pull", onSyncMongoToLocal)}
            >
              {busy === "pull" ? "Syncing..." : "Pull Mongo to local"}
            </button>
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2>Execution</h2>
              <p>Defaults for save cadence, timeouts, and graph concurrency.</p>
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-field">
              <span>Auto-save delay (ms)</span>
              <input
                type="number"
                value={draft.autoSaveDelayMs}
                onChange={(event) => setField("autoSaveDelayMs", Number(event.target.value))}
              />
            </label>
            <label className="setting-field">
              <span>Command timeout (s)</span>
              <input
                type="number"
                value={draft.commandTimeoutSeconds}
                onChange={(event) =>
                  setField("commandTimeoutSeconds", Number(event.target.value))
                }
              />
            </label>
            <label className="setting-field">
              <span>Max parallel nodes</span>
              <input
                type="number"
                value={draft.maxParallelNodes}
                onChange={(event) => setField("maxParallelNodes", Number(event.target.value))}
              />
            </label>
          </div>

          <div className="toggle-grid">
            <label className="toggle-card">
              <div>
                <strong>Developer mode</strong>
                <span>Expose more detail in logs and future tooling panels.</span>
              </div>
              <input
                type="checkbox"
                checked={draft.developerMode}
                onChange={(event) => setField("developerMode", event.target.checked)}
              />
            </label>
            <label className="toggle-card">
              <div>
                <strong>Confirm destructive actions</strong>
                <span>Require confirmation before deleting or replacing workflows.</span>
              </div>
              <input
                type="checkbox"
                checked={draft.confirmDestructiveActions}
                onChange={(event) =>
                  setField("confirmDestructiveActions", event.target.checked)
                }
              />
            </label>
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2>Interface</h2>
              <p>Keep the desktop experience compact, calm, and readable.</p>
            </div>
          </div>

          <div className="toggle-grid">
            <label className="toggle-card">
              <div>
                <strong>Compact mode</strong>
                <span>Use tighter spacing and smaller controls across the app.</span>
              </div>
              <input
                type="checkbox"
                checked={draft.compactMode}
                onChange={(event) => setField("compactMode", event.target.checked)}
              />
            </label>
            <label className="toggle-card">
              <div>
                <strong>Use system appearance</strong>
                <span>Follow the OS-level theme and window tone where possible.</span>
              </div>
              <input
                type="checkbox"
                checked={draft.useSystemAppearance}
                onChange={(event) => setField("useSystemAppearance", event.target.checked)}
              />
            </label>
            <label className="toggle-card">
              <div>
                <strong>Reduce motion</strong>
                <span>Keep animations subtle for long sessions and lower distraction.</span>
              </div>
              <input
                type="checkbox"
                checked={draft.reduceMotion}
                onChange={(event) => setField("reduceMotion", event.target.checked)}
              />
            </label>
            <label className="toggle-card">
              <div>
                <strong>Reopen last workspace</strong>
                <span>Bring back the previous working context when the app starts.</span>
              </div>
              <input
                type="checkbox"
                checked={draft.reopenLastWorkspace}
                onChange={(event) => setField("reopenLastWorkspace", event.target.checked)}
              />
            </label>
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2>Software defaults</h2>
              <p>Pick the tools your workflows should bias toward.</p>
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-field">
              <span>Preferred editor</span>
              <select
                value={draft.preferredEditor}
                onChange={(event) => setField("preferredEditor", event.target.value)}
              >
                {PLUGINS.map((plugin) => (
                  <option key={plugin.id} value={plugin.id}>
                    {plugin.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="setting-field">
              <span>Preferred browser</span>
              <select
                value={draft.preferredBrowser}
                onChange={(event) => setField("preferredBrowser", event.target.value)}
              >
                {BROWSERS.map((browser) => (
                  <option key={browser.id} value={browser.id}>
                    {browser.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="toggle-grid">
            <label className="toggle-card">
              <div>
                <strong>Launch on startup</strong>
                <span>Keep Advflow ready in the background when the system boots.</span>
              </div>
              <input
                type="checkbox"
                checked={draft.launchOnStartup}
                onChange={(event) => setField("launchOnStartup", event.target.checked)}
              />
            </label>
            <label className="toggle-card">
              <div>
                <strong>Telemetry enabled</strong>
                <span>Reserve a flag for future diagnostics and product analytics.</span>
              </div>
              <input
                type="checkbox"
                checked={draft.telemetryEnabled}
                onChange={(event) => setField("telemetryEnabled", event.target.checked)}
              />
            </label>
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2>AI workflow generation</h2>
              <p>Choose Gemini or a local hosted model for workflow generation and node editing.</p>
            </div>
          </div>

          <label className="setting-field">
            <span>Provider</span>
            <select
              value={draft.aiProvider}
              onChange={(event) => setField("aiProvider", event.target.value as AppSettings["aiProvider"])}
            >
              <option value="gemini">Gemini</option>
              <option value="local">Local hosted model</option>
            </select>
          </label>

          {draft.aiProvider === "gemini" ? (
          <div className="setting-row">
            <label className="setting-field">
              <span>API key</span>
              <input
                type="password"
                value={draft.geminiApiKey}
                placeholder="Uses GEMINI_API_KEY if empty"
                onChange={(event) => setField("geminiApiKey", event.target.value)}
              />
            </label>
            <label className="setting-field">
              <span>Model</span>
              <input
                value={draft.geminiModel}
                onChange={(event) => setField("geminiModel", event.target.value)}
              />
            </label>
          </div>
          ) : (
            <>
              <div className="setting-row">
                <label className="setting-field">
                  <span>Endpoint</span>
                  <input
                    value={draft.localModelEndpoint}
                    placeholder="http://127.0.0.1:1234/v1"
                    onChange={(event) => setField("localModelEndpoint", event.target.value)}
                  />
                </label>
                <label className="setting-field">
                  <span>API key</span>
                  <input
                    type="password"
                    value={draft.localModelApiKey}
                    placeholder="Optional for local hosts"
                    onChange={(event) => setField("localModelApiKey", event.target.value)}
                  />
                </label>
              </div>

              <div className="setting-row">
                <label className="setting-field">
                  <span>Model</span>
                  <select
                    value={draft.localModelName}
                    onChange={(event) => setField("localModelName", event.target.value)}
                  >
                    <option value="">Select a local model</option>
                    {localModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="settings-actions">
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => void loadLocalModels()}
                  >
                    {loadingLocalModels ? "Loading..." : "Refresh models"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
