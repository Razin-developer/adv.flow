#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

function appDataCandidates() {
  const roots = [
    process.env.APPDATA,
    process.env.LOCALAPPDATA,
    process.env.HOME && path.join(process.env.HOME, ".config"),
  ].filter(Boolean);
  const names = ["com.advflow.app", "Adv.Flow", "Advflow", "advflow"];
  return roots.flatMap((root) => names.map((name) => path.join(root, name, "workflows.json")));
}

function findWorkflowStore() {
  const direct = appDataCandidates().find((candidate) => fs.existsSync(candidate));
  if (direct) return direct;

  for (const root of [process.env.APPDATA, process.env.LOCALAPPDATA].filter(Boolean)) {
    try {
      const found = fs
        .readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /adv.?flow|com\.advflow/i.test(entry.name))
        .map((entry) => path.join(root, entry.name, "workflows.json"))
        .find((candidate) => fs.existsSync(candidate));
      if (found) return found;
    } catch {
      // Keep scanning other app-data roots.
    }
  }

  return null;
}

function loadWorkflows() {
  const file = findWorkflowStore();
  if (!file) {
    throw new Error("No AdvFlow workflow store found. Open the desktop app once first.");
  }
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`Workflow store is not an array: ${file}`);
  }
  return parsed;
}

function nodeData(node) {
  return node?.data && typeof node.data === "object" ? node.data : node || {};
}

function workflowName(workflow) {
  return typeof workflow?.name === "string" ? workflow.name : "";
}

function workflowId(workflow) {
  return typeof workflow?.id === "string" ? workflow.id : "";
}

function isInAppWorkflow(workflow) {
  return workflow?.kind === "inApp" || (Array.isArray(workflow?.tags) && workflow.tags.includes("in-app"));
}

function terminalWorkflows() {
  return loadWorkflows().filter((workflow) => !isInAppWorkflow(workflow));
}

function list() {
  const workflows = terminalWorkflows();
  if (!workflows.length) {
    console.log("No terminal-runnable workflows yet.");
    return;
  }
  for (const workflow of workflows) {
    const nodes = Array.isArray(workflow.nodes) ? workflow.nodes.length : 0;
    console.log(`${workflowName(workflow)}  ${workflowId(workflow)}  ${nodes} nodes`);
  }
}

function resolveWorkingDirectory(value) {
  const cwd = typeof value === "string" && value.trim() ? value.trim() : process.cwd();
  if (!fs.existsSync(cwd)) {
    throw new Error(`Working directory does not exist: ${cwd}`);
  }
  if (!fs.statSync(cwd).isDirectory()) {
    throw new Error(`Working directory is not a folder: ${cwd}`);
  }
  return cwd;
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function shQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function commandExists(command) {
  const probe = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(probe, [command], { stdio: "ignore" });
  return result.status === 0;
}

function runDetached(command, args) {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
}

function runCommand(data) {
  const command = typeof data.command === "string" ? data.command : "";
  if (!command.trim()) {
    throw new Error("Command is empty");
  }

  const shell = data.shellType || (process.platform === "win32" ? "powershell" : "system");
  const cwd = resolveWorkingDirectory(data.workingDirectory);

  if (data.terminalType === "newWindow") {
    if (process.platform === "win32" && shell === "cmd") {
      runDetached("cmd", ["/c", "start", "", "cmd", "/k", `cd /d "${cwd}" && ${command}`]);
      return;
    }
    if (process.platform === "win32") {
      runDetached("cmd", [
        "/c",
        "start",
        "",
        "powershell",
        "-NoExit",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        `Set-Location -LiteralPath ${psQuote(cwd)}; ${command}`,
      ]);
      return;
    }
    if (process.platform === "darwin") {
      runDetached("osascript", [
        "-e",
        `tell application "Terminal" to do script "cd ${cwd.replace(/\\/g, "\\\\").replace(/"/g, '\\"')} ; ${command.replace(/\\/g, "\\\\").replace(/"/g, '\\"')} ; exec $SHELL -l"`,
        "-e",
        `tell application "Terminal" to activate`,
      ]);
      return;
    }
    const script = `cd ${shQuote(cwd)} && ${command}; exec $SHELL -l`;
    const launchers = [
      ["x-terminal-emulator", ["-e", "sh", "-lc", script]],
      ["gnome-terminal", ["--", "sh", "-lc", script]],
      ["konsole", ["--workdir", cwd, "-e", "sh", "-lc", script]],
      ["kitty", ["--directory", cwd, "sh", "-lc", script]],
      ["alacritty", ["--working-directory", cwd, "-e", "sh", "-lc", script]],
      ["wezterm", ["start", "--cwd", cwd, "sh", "-lc", script]],
      ["xterm", ["-e", "sh", "-lc", script]],
    ];
    const found = launchers.find(([launcher]) => commandExists(launcher));
    if (!found) {
      throw new Error("No supported terminal application was found on this Linux system.");
    }
    runDetached(found[0], found[1]);
    return;
  }

  const [shellCommand, args] =
    shell === "cmd"
      ? ["cmd", ["/c", command]]
      : shell === "powershell"
        ? ["powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command]]
        : shell === "pwsh"
          ? ["pwsh", ["-NoProfile", "-Command", command]]
          : shell === "bash"
            ? ["bash", ["-lc", command]]
            : shell === "zsh"
              ? ["zsh", ["-lc", command]]
              : shell === "sh"
                ? ["sh", ["-lc", command]]
                : [process.env.SHELL || "sh", ["-lc", command]];
  const result = spawnSync(shellCommand, args, {
    cwd,
    stdio: "inherit",
    shell: false,
    windowsHide: false,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function buildOpenAppArgs(data, folder) {
  if (Array.isArray(data.args)) {
    return data.args.map((arg) => String(arg).replaceAll("{path}", folder)).filter(Boolean);
  }
  return folder ? [folder] : [];
}

function runOpenApp(data) {
  const folder = typeof data.folderPath === "string" && data.folderPath.trim() ? data.folderPath.trim() : process.cwd();
  const file = data.appPath || data.command;
  if (!file || typeof file !== "string") {
    throw new Error("App command is empty");
  }

  const args = buildOpenAppArgs(data, folder);
  if (process.platform === "win32" && /\.lnk$/i.test(file)) {
    runDetached("cmd", ["/c", "start", "", file, ...args]);
    return;
  }
  if (process.platform === "win32") {
    const psArgs = args.length ? ` -ArgumentList @(${args.map(psQuote).join(", ")})` : "";
    runDetached("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Start-Process -FilePath ${psQuote(file)}${psArgs}`,
    ]);
    return;
  }
  if (process.platform === "darwin") {
    if (/\.app$/i.test(file)) {
      runDetached("open", ["-a", file, ...args]);
      return;
    }
    if (fs.existsSync(file) || commandExists(file)) {
      runDetached(file, args);
      return;
    }
    runDetached("open", [file]);
    return;
  }
  if (fs.existsSync(file) || commandExists(file)) {
    runDetached(file, args);
    return;
  }
  runDetached("xdg-open", [folder || file]);
}

function runOpenBrowser(data) {
  const url = typeof data.url === "string" ? data.url.trim() : "";
  if (!url) {
    throw new Error("URL is empty");
  }
  if (process.platform === "win32") {
    const browser =
      data.browser === "edge" ? "msedge" : data.browser === "brave" ? "brave" : data.browser === "comet" ? "comet" : data.browser === "firefox" ? "firefox" : "chrome";
    runDetached("cmd", ["/c", "start", "", browser, url]);
    return;
  }
  if (process.platform === "darwin") {
    const app =
      data.browser === "chrome" ? "Google Chrome"
        : data.browser === "edge" ? "Microsoft Edge"
          : data.browser === "brave" ? "Brave Browser"
            : data.browser === "firefox" ? "Firefox"
              : data.browser === "safari" ? "Safari"
                : null;
    runDetached("open", app ? ["-a", app, url] : [url]);
    return;
  }
  const candidates =
    data.browser === "chrome" ? ["google-chrome", "chromium", "chromium-browser"]
      : data.browser === "edge" ? ["microsoft-edge", "microsoft-edge-stable"]
        : data.browser === "brave" ? ["brave-browser", "brave"]
          : data.browser === "firefox" ? ["firefox"]
            : [];
  const browser = candidates.find((candidate) => commandExists(candidate));
  runDetached(browser || "xdg-open", [url]);
}

function runNode(node) {
  const data = nodeData(node);
  switch (data.type) {
    case "runCommand":
      runCommand(data);
      break;
    case "openApp":
      runOpenApp(data);
      break;
    case "openBrowser":
      runOpenBrowser(data);
      break;
    case "delay":
      return new Promise((resolve) => setTimeout(resolve, Math.min(Number(data.delay) || 1000, 60000)));
    default:
      throw new Error(`Unsupported node type: ${data.type || "unknown"}`);
  }
}

async function run(projectName) {
  const workflows = terminalWorkflows();
  const wanted = projectName.toLowerCase();
  const workflow = workflows.find((item) => workflowId(item) === projectName || workflowName(item).toLowerCase() === wanted);
  if (!workflow) {
    throw new Error(`Workflow not found: ${projectName}`);
  }

  for (const node of Array.isArray(workflow.nodes) ? workflow.nodes : []) {
    const data = nodeData(node);
    console.log(`> ${data.label || data.type || "Node"}`);
    await runNode(node);
  }
}

function printHelp() {
  console.log("AdvFlow CLI");
  console.log("Usage:");
  console.log("  advflow ls");
  console.log("  advflow run <project-name-or-id>");
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (command === "ls" || command === "list") {
    list();
    return;
  }
  if (command === "run") {
    if (!args.length) throw new Error("Usage: advflow run <project-name-or-id>");
    await run(args.join(" "));
    return;
  }
  if (!command || command === "-h" || command === "--help") {
    printHelp();
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
