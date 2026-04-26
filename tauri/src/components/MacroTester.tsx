import { useMemo, useState } from "react";
import { Play, RefreshCw, Shield, Terminal } from "lucide-react";
import {
  hotkey,
  isRunningAsAdmin,
  mouseClick,
  mouseDoubleClick,
  moveMouse,
  mouseScroll,
  pressKey,
  replayMacro,
  restartAsAdmin,
  runCommand,
  typeText,
  waitMs,
} from "@/lib/desktopMacro";
import type { MacroAction, MacroMouseButton } from "@/types/macro";

const SAMPLE_MACRO: MacroAction[] = [
  { type: "waitMs", ms: 500 },
  { type: "mouseScroll", amount: -1 },
  { type: "waitMs", ms: 250 },
  { type: "pressKey", key: "tab" },
];

export default function MacroTester() {
  const [status, setStatus] = useState("Desktop macro engine ready.");
  const [busy, setBusy] = useState<string | null>(null);
  const [text, setText] = useState("Advflow macro test");
  const [key, setKey] = useState("enter");
  const [hotkeyValue, setHotkeyValue] = useState("ctrl,shift,p");
  const [command, setCommand] = useState("echo Advflow desktop macro engine");
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [mouseX, setMouseX] = useState(640);
  const [mouseY, setMouseY] = useState(360);
  const [scrollAmount, setScrollAmount] = useState(-1);
  const [button, setButton] = useState<MacroMouseButton>("left");

  const sampleJson = useMemo(() => JSON.stringify(SAMPLE_MACRO, null, 2), []);

  async function runAction(label: string, action: () => Promise<unknown>) {
    setBusy(label);
    try {
      const result = await action();
      setStatus(typeof result === "string" ? result : `${label} completed.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="section-card">
      <div className="section-header">
        <div>
          <h2>Desktop macro engine</h2>
          <p>Exercise Windows input, command, and elevation commands from the React side.</p>
        </div>
        <div className="settings-actions">
          <button
            className="secondary-action"
            type="button"
            onClick={() => void runAction("Admin check", isRunningAsAdmin)}
          >
            <Shield size={14} />
            {busy === "Admin check" ? "Checking..." : "Check admin"}
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => void runAction("Restart as admin", restartAsAdmin)}
          >
            <RefreshCw size={14} />
            Restart elevated
          </button>
        </div>
      </div>

      <div className="status-banner">{status}</div>

      <div className="macro-tester-grid">
        <div className="macro-panel">
          <label className="setting-field">
            <span>Mouse position</span>
            <div className="setting-row">
              <input
                type="number"
                value={mouseX}
                onChange={(event) => setMouseX(Number(event.target.value))}
              />
              <input
                type="number"
                value={mouseY}
                onChange={(event) => setMouseY(Number(event.target.value))}
              />
            </div>
          </label>

          <div className="settings-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={() => void runAction("Move mouse", () => moveMouse(mouseX, mouseY))}
            >
              Move mouse
            </button>
            <select value={button} onChange={(event) => setButton(event.target.value as MacroMouseButton)}>
              <option value="left">Left click</option>
              <option value="right">Right click</option>
              <option value="middle">Middle click</option>
            </select>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void runAction("Mouse click", () => mouseClick(button))}
            >
              Click
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void runAction("Mouse double click", () => mouseDoubleClick(button))}
            >
              Double click
            </button>
          </div>

          <label className="setting-field">
            <span>Scroll amount</span>
            <input
              type="number"
              value={scrollAmount}
              onChange={(event) => setScrollAmount(Number(event.target.value))}
            />
          </label>
          <button
            className="secondary-action"
            type="button"
            onClick={() => void runAction("Scroll", () => mouseScroll(scrollAmount))}
          >
            Scroll
          </button>
        </div>

        <div className="macro-panel">
          <label className="setting-field">
            <span>Type text</span>
            <textarea value={text} rows={4} onChange={(event) => setText(event.target.value)} />
          </label>
          <div className="settings-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={() => void runAction("Type text", () => typeText(text))}
            >
              Type text
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void runAction("Wait", () => waitMs(1000))}
            >
              Wait 1s
            </button>
          </div>

          <label className="setting-field">
            <span>Press key</span>
            <input value={key} onChange={(event) => setKey(event.target.value)} />
          </label>
          <button
            className="secondary-action"
            type="button"
            onClick={() => void runAction("Press key", () => pressKey(key))}
          >
            Press key
          </button>

          <label className="setting-field">
            <span>Hotkey</span>
            <input
              value={hotkeyValue}
              onChange={(event) => setHotkeyValue(event.target.value)}
            />
          </label>
          <button
            className="secondary-action"
            type="button"
            onClick={() =>
              void runAction("Hotkey", () =>
                hotkey(
                  hotkeyValue
                    .split(",")
                    .map((part) => part.trim())
                    .filter(Boolean),
                ),
              )
            }
          >
            Send hotkey
          </button>
        </div>

        <div className="macro-panel">
          <label className="setting-field">
            <span>Run command</span>
            <textarea
              value={command}
              rows={4}
              onChange={(event) => setCommand(event.target.value)}
            />
          </label>
          <label className="setting-field">
            <span>Working directory</span>
            <input
              value={workingDirectory}
              placeholder="Optional"
              onChange={(event) => setWorkingDirectory(event.target.value)}
            />
          </label>
          <div className="settings-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={() =>
                void runAction("Run command", () =>
                  runCommand(command, workingDirectory || null, false),
                )
              }
            >
              <Terminal size={14} />
              Run command
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() =>
                void runAction("Run elevated command", () =>
                  runCommand(command, workingDirectory || null, true),
                )
              }
            >
              <Shield size={14} />
              Run elevated
            </button>
          </div>

          <label className="setting-field">
            <span>Replay macro JSON</span>
            <textarea value={sampleJson} rows={8} readOnly />
          </label>
          <button
            className="primary-button"
            type="button"
            onClick={() => void runAction("Replay macro", () => replayMacro(SAMPLE_MACRO))}
          >
            <Play size={14} />
            Replay sample macro
          </button>
        </div>
      </div>
    </section>
  );
}
