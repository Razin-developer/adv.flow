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

fn is_in_app_workflow(workflow: &Value) -> bool {
    string_field(workflow, "kind") == "inApp"
        || workflow
            .get("tags")
            .and_then(Value::as_array)
            .is_some_and(|tags| tags.iter().any(|tag| tag.as_str() == Some("in-app")))
}

fn list_workflows() -> Result<(), String> {
    let workflows = load_workflows()?
        .into_iter()
        .filter(|workflow| !is_in_app_workflow(workflow))
        .collect::<Vec<_>>();
    if workflows.is_empty() {
        println!("No terminal-runnable workflows yet.");
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

fn sh_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}

fn command_exists(command: &str) -> bool {
    let lookup = if cfg!(windows) { "where" } else { "which" };
    Command::new(lookup)
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn shell_command_and_args(shell_type: &str, command: &str) -> (String, Vec<String>) {
    match shell_type {
        "cmd" => ("cmd".to_string(), vec!["/c".to_string(), command.to_string()]),
        "powershell" => (
            "powershell".to_string(),
            vec![
                "-NoProfile".to_string(),
                "-ExecutionPolicy".to_string(),
                "Bypass".to_string(),
                "-Command".to_string(),
                command.to_string(),
            ],
        ),
        "pwsh" => {
            if command_exists("pwsh") {
                (
                    "pwsh".to_string(),
                    vec!["-NoProfile".to_string(), "-Command".to_string(), command.to_string()],
                )
            } else {
                (
                    "powershell".to_string(),
                    vec![
                        "-NoProfile".to_string(),
                        "-ExecutionPolicy".to_string(),
                        "Bypass".to_string(),
                        "-Command".to_string(),
                        command.to_string(),
                    ],
                )
            }
        },
        "bash" => ("bash".to_string(), vec!["-lc".to_string(), command.to_string()]),
        "zsh" => ("zsh".to_string(), vec!["-lc".to_string(), command.to_string()]),
        "sh" => ("sh".to_string(), vec!["-lc".to_string(), command.to_string()]),
        _ => {
            if cfg!(windows) {
                (
                    "powershell".to_string(),
                    vec![
                        "-NoProfile".to_string(),
                        "-ExecutionPolicy".to_string(),
                        "Bypass".to_string(),
                        "-Command".to_string(),
                        command.to_string(),
                    ],
                )
            } else if let Ok(user_shell) = env::var("SHELL") {
                (user_shell, vec!["-lc".to_string(), command.to_string()])
            } else {
                ("sh".to_string(), vec!["-lc".to_string(), command.to_string()])
            }
        }
    }
}

fn start_new_terminal(shell_type: &str, cwd: &Path, command: &str) -> Result<(), String> {
    let cwd_text = cwd.to_string_lossy();
    
    if cfg!(windows) {
        let (shell_command, _shell_args) = shell_command_and_args(shell_type, command);
        let mut args = vec![
            "/c".to_string(),
            "start".to_string(),
            "".to_string(),
            shell_command.clone(),
        ];
        if shell_command == "powershell" || shell_command == "pwsh" {
            args.extend([
                "-NoExit".to_string(),
                "-NoProfile".to_string(),
                "-ExecutionPolicy".to_string(),
                "Bypass".to_string(),
                "-Command".to_string(),
                format!("Set-Location -LiteralPath {}; {}", ps_quote(&cwd_text), command),
            ]);
        } else {
            args.push("/k".to_string());
            args.push(format!("cd /d \"{}\" && {}", cwd_text.replace('"', "\"\""), command));
        }
        Command::new("cmd")
            .args(args)
            .spawn()
            .map_err(|error| error.to_string())?;
    } else if cfg!(target_os = "macos") {
        let script = format!(
            "tell application \"Terminal\" to do script \"cd {} ; {}; exec $SHELL -l\"\ntell application \"Terminal\" to activate",
            cwd_text.replace('\\', "\\\\").replace('"', "\\\""),
            command.replace('\\', "\\\\").replace('"', "\\\"")
        );
        Command::new("osascript")
            .arg("-e")
            .arg(script)
            .spawn()
            .map_err(|error| error.to_string())?;
    } else {
        let script = format!("cd {} && {}; exec $SHELL -l", sh_quote(&cwd_text), command);
        let launchers: [(&str, &[&str]); 8] = [
            ("x-terminal-emulator", &["-e", "sh", "-lc"]),
            ("gnome-terminal", &["--", "sh", "-lc"]),
            ("konsole", &["-e", "sh", "-lc"]),
            ("xfce4-terminal", &["-e", "sh -lc"]),
            ("kitty", &["sh", "-lc"]),
            ("alacritty", &["-e", "sh", "-lc"]),
            ("wezterm", &["start", "--cwd"]),
            ("xterm", &["-e", "sh", "-lc"]),
        ];

        for (launcher, prefix) in launchers {
            if !command_exists(launcher) {
                continue;
            }
            let mut process = Command::new(launcher);
            match launcher {
                "wezterm" => {
                    process.args(prefix).arg(cwd).arg("sh").arg("-lc").arg(&script);
                }
                "kitty" => {
                    process.arg("--directory").arg(cwd).args(prefix).arg(&script);
                }
                "alacritty" => {
                    process.arg("--working-directory").arg(cwd).args(prefix).arg(&script);
                }
                "xfce4-terminal" => {
                    process.arg("--working-directory").arg(cwd).arg("-e").arg(format!("sh -lc {}", sh_quote(&script)));
                }
                "gnome-terminal" => {
                    process.arg(format!("--working-directory={}", cwd.display())).args(prefix).arg(&script);
                }
                "konsole" => {
                    process.arg("--workdir").arg(cwd).args(prefix).arg(&script);
                }
                _ => {
                    process.current_dir(cwd).args(prefix).arg(&script);
                }
            }
            process.spawn().map_err(|error| error.to_string())?;
            return Ok(());
        }
        return Err("No supported terminal application was found on this Linux system.".to_string());
    }
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

    let (shell_command, shell_args) = shell_command_and_args(shell_type, command);
    let status = Command::new(shell_command)
        .args(shell_args)
        .current_dir(cwd)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()
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

    if cfg!(windows) {
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
    } else if cfg!(target_os = "macos") {
        if command.ends_with(".app") {
            let mut process = Command::new("open");
            process.arg("-a").arg(command);
            if !folder.trim().is_empty() {
                process.arg(folder);
            }
            process.spawn().map_err(|error| error.to_string())?;
        } else if Path::new(command).exists() || command_exists(command) {
            let mut process = Command::new(command);
            if !folder.trim().is_empty() {
                process.arg(folder);
            }
            process.spawn().map_err(|error| error.to_string())?;
        } else {
            Command::new("open")
                .arg(command)
                .spawn()
                .map_err(|error| error.to_string())?;
        }
    } else {
        if Path::new(command).exists() || command_exists(command) {
            let mut process = Command::new(command);
            if !folder.trim().is_empty() {
                process.arg(folder);
            }
            process.spawn().map_err(|error| error.to_string())?;
        } else {
            let target = if folder.trim().is_empty() { command } else { folder };
            Command::new("xdg-open")
                .arg(target)
                .spawn()
                .map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}


fn open_browser_node(data: &Value) -> Result<(), String> {
    let url = string_field(data, "url");
    if url.trim().is_empty() {
        return Err("URL is empty".to_string());
    }
    
    if cfg!(windows) {
        let browser = match string_field(data, "browser") {
            "edge" => "msedge",
            "brave" => "brave",
            "comet" => "comet",
            "firefox" => "firefox",
            _ => "chrome",
        };
        Command::new("cmd")
            .args(["/c", "start", "", browser, url])
            .spawn()
            .map_err(|error| error.to_string())?;
    } else if cfg!(target_os = "macos") {
        let app_name = match string_field(data, "browser") {
            "chrome" => Some("Google Chrome"),
            "edge" => Some("Microsoft Edge"),
            "brave" => Some("Brave Browser"),
            "firefox" => Some("Firefox"),
            "safari" => Some("Safari"),
            _ => None,
        };
        let mut process = Command::new("open");
        if let Some(app_name) = app_name {
            process.arg("-a").arg(app_name);
        }
        process.arg(url).spawn().map_err(|error| error.to_string())?;
    } else {
        let candidates = match string_field(data, "browser") {
            "chrome" => vec!["google-chrome", "chromium", "chromium-browser"],
            "edge" => vec!["microsoft-edge", "microsoft-edge-stable"],
            "brave" => vec!["brave-browser", "brave"],
            "firefox" => vec!["firefox"],
            _ => vec![],
        };
        if let Some(browser) = candidates.into_iter().find(|candidate| command_exists(candidate)) {
            Command::new(browser)
                .arg(url)
                .spawn()
                .map_err(|error| error.to_string())?;
        } else {
            Command::new("xdg-open")
                .arg(url)
                .spawn()
                .map_err(|error| error.to_string())?;
        }
    }
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
        .filter(|workflow| !is_in_app_workflow(workflow))
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
    // Ensure we see something even if it exits quickly
    if env::args().len() <= 1 {
        print_help();
        return;
    }

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
        eprintln!("\nError: {error}");
        // Wait for a moment so the user can see the error if they double-clicked
        if env::var_os("TERM").is_none() && env::var_os("PROMPT").is_none() {
            println!("\nPress Enter to close...");
            let mut input = String::new();
            let _ = std::io::stdin().read_line(&mut input);
        }
        std::process::exit(1);
    }
}
