#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync, spawn } = require("child_process");

function appDataCandidates() {
  const roots = [
    process.env.APPDATA,
    process.env.LOCALAPPDATA,
    process.env.HOME && path.join(process.env.HOME, ".config"),
  ].filter(Boolean);
  const names = ["com.advflow.app", "Adv.Flow", "Advflow", "advflow"];
  return roots.flatMap((root) => names.map((name) => path.join(root, name, "workflows.json")));
}

function loadWorkflows() {
  const direct = appDataCandidates().find((candidate) => fs.existsSync(candidate));
  const fallback = [process.env.APPDATA, process.env.LOCALAPPDATA]
    .filter(Boolean)
    .flatMap((root) => {
      try {
        return fs
          .readdirSync(root, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && /adv.?flow|com\.advflow/i.test(entry.name))
          .map((entry) => path.join(root, entry.name, "workflows.json"));
      } catch {
        return [];
      }
    })
    .find((candidate) => fs.existsSync(candidate));
  const file = direct || fallback;
  if (!file) {
    throw new Error("No Advflow workflow store found. Open the desktop app once first.");
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function list() {
  const workflows = loadWorkflows();
  if (!workflows.length) {
    console.log("No workflows yet.");
    return;
  }
  for (const workflow of workflows) {
    console.log(`${workflow.name}  ${workflow.id}  ${workflow.nodes?.length || 0} nodes`);
  }
}

function runCommand(data) {
  const shell = data.shellType === "cmd" ? "cmd" : "powershell";
  const cwd = data.workingDirectory && data.workingDirectory.trim() ? data.workingDirectory : process.cwd();
  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
    throw new Error(`Working directory does not exist: ${cwd}`);
  }
  if (data.terminalType === "newWindow") {
    if (shell === "cmd") {
      spawn("cmd", ["/c", "start", "", "cmd", "/k", `cd /d "${cwd}" && ${data.command}`], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } else {
      spawn("cmd", [
        "/c",
        "start",
        "",
        "powershell",
        "-NoExit",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        `Set-Location -LiteralPath '${cwd.replace(/'/g, "''")}'; ${data.command}`,
      ], { detached: true, stdio: "ignore" }).unref();
    }
    return;
  }
  const args = shell === "cmd" ? ["/c", data.command] : ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", data.command];
  const result = spawnSync(shell, args, {
    cwd,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function runOpenApp(data) {
  const folder = data.folderPath || process.cwd();
  const args = Array.isArray(data.args) ? data.args.map((arg) => arg.replace("{path}", folder)) : [folder];
  const file = data.appPath || data.command;
  if (/\.lnk$/i.test(file)) {
    spawn("cmd", ["/c", "start", "", file, ...args.filter(Boolean)], {
      detached: true,
      stdio: "ignore",
    }).unref();
    return;
  }
  const psArgs = args
    .filter(Boolean)
    .map((arg) => `'${arg.replace(/'/g, "''")}'`)
    .join(", ");
  const script = psArgs
    ? `Start-Process -FilePath '${file.replace(/'/g, "''")}' -ArgumentList @(${psArgs})`
    : `Start-Process -FilePath '${file.replace(/'/g, "''")}'`;
  spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

function runOpenBrowser(data) {
  const browser = data.browser === "edge" ? "msedge" : data.browser === "brave" ? "brave" : "chrome";
  spawn("cmd", ["/c", "start", "", browser, data.url], { detached: true, stdio: "ignore" }).unref();
}

async function run(projectName) {
  const workflows = loadWorkflows();
  const workflow = workflows.find(
    (item) =>
      item.name.toLowerCase() === projectName.toLowerCase() ||
      item.id === projectName,
  );
  if (!workflow) {
    throw new Error(`Workflow not found: ${projectName}`);
  }
  for (const node of workflow.nodes || []) {
    const data = node.data || node;
    console.log(`> ${data.label || data.type}`);
    if (data.type === "runCommand") runCommand(data);
    if (data.type === "openApp") runOpenApp(data);
    if (data.type === "openBrowser") runOpenBrowser(data);
    if (data.type === "delay") await new Promise((resolve) => setTimeout(resolve, Math.min(data.delay || 1000, 60000)));
  }
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (command === "ls" || command === "list") {
    list();
    return;
  }
  if (command === "run") {
    if (!args.length) throw new Error("Usage: advflow run <project-name>");
    await run(args.join(" "));
    return;
  }
  console.log("Usage:");
  console.log("  advflow ls");
  console.log("  advflow run <project-name>");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
