use serde_json::Value;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;

fn app_data_candidates() -> Vec<PathBuf> {
    let roots = [
        env::var_os("APPDATA").map(PathBuf::from),
        env::var_os("LOCALAPPDATA").map(PathBuf::from),
        env::var_os("HOME").map(|home| PathBuf::from(home).join(".config")),
    ];
    let names = ["com.advflow.app", "Adv.Flow", "Advflow", "advflow"];

    roots
        .into_iter()
        .flatten()
        .flat_map(|root| names.iter().map(move |name| root.join(name).join("workflows.json")))
        .collect()
}

fn workflows_path() -> Result<PathBuf, String> {
    app_data_candidates()
        .into_iter()
        .find(|path| path.exists())
        .ok_or_else(|| "No AdvFlow workflow store found. Open the desktop app once first.".to_string())
}

fn load_workflows() -> Result<Vec<Value>, String> {
    let path = workflows_path()?;
    let content = fs::read_to_string(&path)
        .map_err(|error| format!("Could not read {}: {error}", path.display()))?;
    serde_json::from_str(&content)
        .map_err(|error| format!("Workflow store is not valid JSON: {error}"))
}

fn data_for_node(node: &Value) -> &Value {
    node.get("data").unwrap_or(node)
}

fn string_field<'a>(value: &'a Value, key: &str) -> &'a str {
    value.get(key).and_then(Value::as_str).unwrap_or("")
}

fn workflow_name(workflow: &Value) -> &str {
    string_field(workflow, "name")
}

fn workflow_id(workflow: &Value) -> &str {
    string_field(workflow, "id")
}

fn list_workflows() -> Result<(), String> {
    let workflows = load_workflows()?;
    if workflows.is_empty() {
        println!("No workflows yet.");
        return Ok(());
    }

    for workflow in workflows {
        let node_count = workflow
            .get("nodes")
            .and_then(Value::as_array)
            .map_or(0, Vec::len);
        println!(
            "{}  {}  {} nodes",
            workflow_name(&workflow),
            workflow_id(&workflow),
            node_count
        );
    }
    Ok(())
}

fn resolve_working_directory(value: &str) -> Result<PathBuf, String> {
    let path = if value.trim().is_empty() {
        env::current_dir().map_err(|error| error.to_string())?
    } else {
        PathBuf::from(value.trim())
    };

    if !path.exists() {
        return Err(format!("Working directory does not exist: {}", path.display()));
    }
    if !path.is_dir() {
        return Err(format!("Working directory is not a folder: {}", path.display()));
    }
    Ok(path)
}

fn ps_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn start_new_terminal(shell_type: &str, cwd: &Path, command: &str) -> Result<(), String> {
    let cwd_text = cwd.to_string_lossy();
    if shell_type == "cmd" {
        Command::new("cmd")
            .args([
                "/c",
                "start",
                "",
                "cmd",
                "/k",
                &format!("cd /d \"{}\" && {}", cwd_text, command),
            ])
            .spawn()
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    Command::new("cmd")
        .args([
            "/c",
            "start",
            "",
            "powershell",
            "-NoExit",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &format!("Set-Location -LiteralPath {}; {}", ps_quote(&cwd_text), command),
        ])
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn run_command_node(data: &Value) -> Result<(), String> {
    let command = string_field(data, "command");
    if command.trim().is_empty() {
        return Err("Command is empty".to_string());
    }

    let cwd = resolve_working_directory(string_field(data, "workingDirectory"))?;
    let shell_type = string_field(data, "shellType");
    let terminal_type = string_field(data, "terminalType");

    if terminal_type == "newWindow" {
        return start_new_terminal(shell_type, &cwd, command);
    }

    let status = if shell_type == "cmd" {
        Command::new("cmd")
            .args(["/c", command])
            .current_dir(cwd)
            .stdin(Stdio::inherit())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .status()
    } else {
        Command::new("powershell")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command])
            .current_dir(cwd)
            .stdin(Stdio::inherit())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .status()
    }
    .map_err(|error| error.to_string())?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Command failed with status {status}"))
    }
}

fn open_app_node(data: &Value) -> Result<(), String> {
    let folder = string_field(data, "folderPath");
    let file = string_field(data, "appPath");
    let command = if file.trim().is_empty() {
        string_field(data, "command")
    } else {
        file
    };

    if command.trim().is_empty() {
        return Err("App command is empty".to_string());
    }

    if command.to_ascii_lowercase().ends_with(".lnk") {
        Command::new("cmd")
            .args(["/c", "start", "", command, folder])
            .spawn()
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    let script = if folder.trim().is_empty() {
        format!("Start-Process -FilePath {}", ps_quote(command))
    } else {
        format!(
            "Start-Process -FilePath {} -ArgumentList @({})",
            ps_quote(command),
            ps_quote(folder)
        )
    };
    Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script])
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn open_browser_node(data: &Value) -> Result<(), String> {
    let url = string_field(data, "url");
    if url.trim().is_empty() {
        return Err("URL is empty".to_string());
    }
    let browser = match string_field(data, "browser") {
        "edge" => "msedge",
        "brave" => "brave",
        "comet" => "comet",
        _ => "chrome",
    };
    Command::new("cmd")
        .args(["/c", "start", "", browser, url])
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn run_node(node: &Value) -> Result<(), String> {
    let data = data_for_node(node);
    match string_field(data, "type") {
        "runCommand" => run_command_node(data),
        "openApp" => open_app_node(data),
        "openBrowser" => open_browser_node(data),
        "delay" => {
            let delay = data.get("delay").and_then(Value::as_u64).unwrap_or(1000);
            thread::sleep(Duration::from_millis(delay.min(60_000)));
            Ok(())
        }
        node_type => Err(format!("Unsupported node type: {node_type}")),
    }
}

fn run_workflow(name_or_id: &str) -> Result<(), String> {
    let workflows = load_workflows()?;
    let wanted = name_or_id.to_lowercase();
    let workflow = workflows
        .iter()
        .find(|workflow| workflow_id(workflow) == name_or_id || workflow_name(workflow).to_lowercase() == wanted)
        .ok_or_else(|| format!("Workflow not found: {name_or_id}"))?;

    let nodes = workflow
        .get("nodes")
        .and_then(Value::as_array)
        .ok_or_else(|| "Workflow has no nodes".to_string())?;

    for node in nodes {
        let data = data_for_node(node);
        let label = string_field(data, "label");
        println!("> {}", if label.is_empty() { string_field(data, "type") } else { label });
        run_node(node)?;
    }

    Ok(())
}

fn print_help() {
    println!("AdvFlow CLI");
    println!("Usage:");
    println!("  advflow ls");
    println!("  advflow run <project-name-or-id>");
}

fn main() {
    let mut args = env::args().skip(1);
    let result = match args.next().as_deref() {
        Some("ls") | Some("list") => list_workflows(),
        Some("run") => {
            let name = args.collect::<Vec<_>>().join(" ");
            if name.trim().is_empty() {
                Err("Usage: advflow run <project-name-or-id>".to_string())
            } else {
                run_workflow(&name)
            }
        }
        Some("-h") | Some("--help") | None => {
            print_help();
            Ok(())
        }
        Some(command) => Err(format!("Unknown command: {command}")),
    };

    if let Err(error) = result {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
