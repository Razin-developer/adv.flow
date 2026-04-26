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

  const shell = data.shellType === "cmd" ? "cmd" : "powershell";
  const cwd = resolveWorkingDirectory(data.workingDirectory);

  if (data.terminalType === "newWindow") {
    if (shell === "cmd") {
      runDetached("cmd", ["/c", "start", "", "cmd", "/k", `cd /d "${cwd}" && ${command}`]);
      return;
    }
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

  const args =
    shell === "cmd"
      ? ["/c", command]
      : ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command];
  const result = spawnSync(shell, args, {
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
  if (/\.lnk$/i.test(file)) {
    runDetached("cmd", ["/c", "start", "", file, ...args]);
    return;
  }

  const psArgs = args.length ? ` -ArgumentList @(${args.map(psQuote).join(", ")})` : "";
  runDetached("powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    `Start-Process -FilePath ${psQuote(file)}${psArgs}`,
  ]);
}

function runOpenBrowser(data) {
  const url = typeof data.url === "string" ? data.url.trim() : "";
  if (!url) {
    throw new Error("URL is empty");
  }
  const browser =
    data.browser === "edge" ? "msedge" : data.browser === "brave" ? "brave" : data.browser === "comet" ? "comet" : "chrome";
  runDetached("cmd", ["/c", "start", "", browser, url]);
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
