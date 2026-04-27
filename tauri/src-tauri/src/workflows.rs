use chrono::Utc;
use futures_util::TryStreamExt;
use mongodb::{
    bson::doc,
    options::ClientOptions,
    Client, Collection,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;
#[cfg(windows)]
use windows::Win32::{
    Foundation::{CloseHandle, HWND},
    System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION},
    UI::{
        Input::KeyboardAndMouse::{
            GetAsyncKeyState, VK_CONTROL, VK_F1, VK_F10, VK_F11, VK_F12, VK_F2, VK_F3, VK_F4,
            VK_F5, VK_F6, VK_F7, VK_F8, VK_F9, VK_LWIN, VK_MENU, VK_RETURN, VK_SHIFT,
            VK_SPACE, VK_TAB,
        },
        WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId},
    },
};


use crate::macro_engine;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct Workflow {
    pub id: String,
    pub name: String,
    pub description: String,
    pub favorite: bool,
    pub kind: String,
    pub base_app_id: String,
    pub entry_hotkey: String,
    pub nodes: Vec<Value>,
    pub edges: Vec<Value>,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Default for Workflow {
    fn default() -> Self {
        let now = timestamp();
        Self {
            id: String::new(),
            name: "Untitled workflow".to_string(),
            description: String::new(),
            favorite: false,
            kind: "desktop".to_string(),
            base_app_id: String::new(),
            entry_hotkey: String::new(),
            nodes: Vec::new(),
            edges: Vec::new(),
            tags: Vec::new(),
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct AppSettings {
    pub storage_mode: String,
    pub mongodb_uri: String,
    pub mongodb_database: String,
    pub mongodb_collection: String,
    pub auto_save_delay_ms: u32,
    pub command_timeout_seconds: u32,
    pub max_parallel_nodes: u32,
    pub compact_mode: bool,
    pub use_system_appearance: bool,
    pub reduce_motion: bool,
    pub confirm_destructive_actions: bool,
    pub launch_on_startup: bool,
    pub reopen_last_workspace: bool,
    pub developer_mode: bool,
    pub telemetry_enabled: bool,
    pub sync_on_open: bool,
    pub preferred_browser: String,
    pub preferred_editor: String,
    pub ai_provider: String,
    pub gemini_api_key: String,
    pub gemini_model: String,
    pub local_model_endpoint: String,
    pub local_model_api_key: String,
    pub local_model_name: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            storage_mode: "local".to_string(),
            mongodb_uri: String::new(),
            mongodb_database: "advflow".to_string(),
            mongodb_collection: "workflows".to_string(),
            auto_save_delay_ms: 900,
            command_timeout_seconds: 120,
            max_parallel_nodes: 4,
            compact_mode: true,
            use_system_appearance: true,
            reduce_motion: false,
            confirm_destructive_actions: true,
            launch_on_startup: false,
            reopen_last_workspace: true,
            developer_mode: false,
            telemetry_enabled: false,
            sync_on_open: false,
            preferred_browser: "chrome".to_string(),
            preferred_editor: "vscode".to_string(),
            ai_provider: "gemini".to_string(),
            gemini_api_key: String::new(),
            gemini_model: "gemini-2.5-flash".to_string(),
            local_model_endpoint: "http://127.0.0.1:1234/v1".to_string(),
            local_model_api_key: String::new(),
            local_model_name: String::new(),
        }
    }
}

pub struct AppState {
    pub workflows_path: PathBuf,
    pub settings_path: PathBuf,
    pub workflows: Mutex<Vec<Workflow>>,
    pub settings: Mutex<AppSettings>,
    pub in_app_listener_started: AtomicBool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InstalledApp {
    pub id: String,
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub path: Option<String>,
    pub source: String,
}

impl AppState {
    fn save_local_workflows(&self) -> Result<(), String> {
        let data = self.workflows.lock().unwrap();
        let json = serde_json::to_string_pretty(&*data).map_err(|error| error.to_string())?;
        fs::write(&self.workflows_path, json).map_err(|error| error.to_string())?;
        Ok(())
    }

    fn save_settings(&self) -> Result<(), String> {
        let data = self.settings.lock().unwrap();
        let json = serde_json::to_string_pretty(&*data).map_err(|error| error.to_string())?;
        fs::write(&self.settings_path, json).map_err(|error| error.to_string())?;
        Ok(())
    }
}

fn timestamp() -> String {
    Utc::now().to_rfc3339()
}

fn normalize_workflow(workflow: &mut Workflow) {
    if workflow.id.trim().is_empty() {
        workflow.id = Uuid::new_v4().to_string();
    }
    if workflow.created_at.trim().is_empty() {
        workflow.created_at = timestamp();
    }
    if workflow.updated_at.trim().is_empty() {
        workflow.updated_at = workflow.created_at.clone();
    }
    if workflow.kind.trim().is_empty() {
        workflow.kind = "desktop".to_string();
    }
    if workflow.kind != "inApp" {
        workflow.kind = "desktop".to_string();
        workflow.base_app_id.clear();
        workflow.entry_hotkey.clear();
    }
    for (index, node) in workflow.nodes.iter_mut().enumerate() {
        normalize_node(node, index);
    }
    for (index, edge) in workflow.edges.iter_mut().enumerate() {
        normalize_edge(edge, index);
    }
}

fn sorted_workflows(mut workflows: Vec<Workflow>) -> Vec<Workflow> {
    workflows.sort_by(|left, right| {
        right
            .favorite
            .cmp(&left.favorite)
            .then_with(|| right.updated_at.cmp(&left.updated_at))
    });
    workflows
}

fn validate_settings(settings: &mut AppSettings) {
    if settings.storage_mode != "mongodb" {
        settings.storage_mode = "local".to_string();
    }
    if settings.mongodb_database.trim().is_empty() {
        settings.mongodb_database = "advflow".to_string();
    }
    if settings.mongodb_collection.trim().is_empty() {
        settings.mongodb_collection = "workflows".to_string();
    }
    settings.auto_save_delay_ms = settings.auto_save_delay_ms.clamp(250, 5_000);
    settings.command_timeout_seconds = settings.command_timeout_seconds.clamp(15, 1_800);
    settings.max_parallel_nodes = settings.max_parallel_nodes.clamp(1, 16);
    if settings.ai_provider != "local" {
        settings.ai_provider = "gemini".to_string();
    }
    if settings.preferred_browser.trim().is_empty() {
        settings.preferred_browser = "system".to_string();
    }
    if settings.preferred_editor.trim().is_empty() {
        settings.preferred_editor = "vscode".to_string();
    }
    if settings.gemini_model.trim().is_empty() {
        settings.gemini_model = "gemini-2.5-flash".to_string();
    }
    if settings.local_model_endpoint.trim().is_empty() {
        settings.local_model_endpoint = "http://127.0.0.1:1234/v1".to_string();
    }
}

fn configure_launch_on_startup(enabled: bool) {
    let Ok(exe) = std::env::current_exe() else {
        return;
    };
    #[cfg(windows)]
    {
        if enabled {
            let _ = Command::new("reg")
                .args([
                    "add",
                    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    "/v",
                    "Advflow",
                    "/t",
                    "REG_SZ",
                    "/d",
                    &exe.to_string_lossy(),
                    "/f",
                ])
                .output();
        } else {
            let _ = Command::new("reg")
                .args([
                    "delete",
                    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    "/v",
                    "Advflow",
                    "/f",
                ])
                .output();
        }
    }
    #[cfg(target_os = "macos")]
    {
        let Some(home) = std::env::var_os("HOME") else {
            return;
        };
        let agents_dir = PathBuf::from(home).join("Library/LaunchAgents");
        let agent_path = agents_dir.join("com.advflow.app.plist");
        if enabled {
            let _ = fs::create_dir_all(&agents_dir);
            let plist = format!(
                r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.advflow.app</string>
    <key>ProgramArguments</key>
    <array>
      <string>{}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
  </dict>
</plist>"#,
                exe.to_string_lossy()
            );
            let _ = fs::write(agent_path, plist);
        } else {
            let _ = fs::remove_file(agent_path);
        }
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let Some(home) = std::env::var_os("HOME") else {
            return;
        };
        let autostart_dir = PathBuf::from(home).join(".config/autostart");
        let desktop_path = autostart_dir.join("advflow.desktop");
        if enabled {
            let _ = fs::create_dir_all(&autostart_dir);
            let desktop_entry = format!(
                "[Desktop Entry]\nType=Application\nVersion=1.0\nName=AdvFlow\nExec=\"{}\"\nX-GNOME-Autostart-enabled=true\n",
                exe.to_string_lossy()
            );
            let _ = fs::write(desktop_path, desktop_entry);
        } else {
            let _ = fs::remove_file(desktop_path);
        }
    }
}

fn slug(value: &str) -> String {
    let mut output = String::new();
    for character in value.to_lowercase().chars() {
        if character.is_ascii_alphanumeric() {
            output.push(character);
        } else if !output.ends_with('-') {
            output.push('-');
        }
    }
    output.trim_matches('-').to_string()
}

fn workflow_by_id_or_name(workflows: &[Workflow], value: &str) -> Option<Workflow> {
    let wanted = value.to_lowercase();
    workflows
        .iter()
        .find(|workflow| workflow.id == value || workflow.name.to_lowercase() == wanted)
        .cloned()
}

fn known_app_candidates() -> Vec<InstalledApp> {
    let mut apps = vec![
        InstalledApp {
            id: "vscode".to_string(),
            name: "Visual Studio Code".to_string(),
            command: "code".to_string(),
            args: vec!["{path}".to_string()],
            path: None,
            source: "path".to_string(),
        },
        InstalledApp {
            id: "cursor".to_string(),
            name: "Cursor".to_string(),
            command: "cursor".to_string(),
            args: vec!["{path}".to_string()],
            path: None,
            source: "path".to_string(),
        },
        InstalledApp {
            id: "antigravity".to_string(),
            name: "Antigravity".to_string(),
            command: "antigravity".to_string(),
            args: vec!["{path}".to_string()],
            path: None,
            source: "path".to_string(),
        },
    ];

    #[cfg(windows)]
    apps.extend([
        InstalledApp {
            id: "notepad".to_string(),
            name: "Notepad".to_string(),
            command: "notepad".to_string(),
            args: vec![],
            path: None,
            source: "windows".to_string(),
        },
        InstalledApp {
            id: "explorer".to_string(),
            name: "File Explorer".to_string(),
            command: "explorer".to_string(),
            args: vec!["{path}".to_string()],
            path: None,
            source: "windows".to_string(),
        },
    ]);

    #[cfg(target_os = "macos")]
    apps.extend([
        InstalledApp {
            id: "vscode".to_string(),
            name: "Visual Studio Code".to_string(),
            command: "open".to_string(),
            args: vec!["-a".to_string(), "{appPath}".to_string(), "{path}".to_string()],
            path: Some("/Applications/Visual Studio Code.app".to_string()),
            source: "applications".to_string(),
        },
        InstalledApp {
            id: "cursor".to_string(),
            name: "Cursor".to_string(),
            command: "open".to_string(),
            args: vec!["-a".to_string(), "{appPath}".to_string(), "{path}".to_string()],
            path: Some("/Applications/Cursor.app".to_string()),
            source: "applications".to_string(),
        },
        InstalledApp {
            id: "finder".to_string(),
            name: "Finder".to_string(),
            command: "open".to_string(),
            args: vec!["-a".to_string(), "Finder".to_string(), "{path}".to_string()],
            path: None,
            source: "macos".to_string(),
        },
        InstalledApp {
            id: "terminal".to_string(),
            name: "Terminal".to_string(),
            command: "open".to_string(),
            args: vec!["-a".to_string(), "Terminal".to_string(), "{path}".to_string()],
            path: None,
            source: "macos".to_string(),
        },
    ]);

    #[cfg(all(unix, not(target_os = "macos")))]
    apps.extend([
        InstalledApp {
            id: "files".to_string(),
            name: "Files".to_string(),
            command: "xdg-open".to_string(),
            args: vec!["{path}".to_string()],
            path: None,
            source: "linux".to_string(),
        },
        InstalledApp {
            id: "terminal".to_string(),
            name: "Terminal".to_string(),
            command: "x-terminal-emulator".to_string(),
            args: vec![],
            path: None,
            source: "linux".to_string(),
        },
    ]);

    apps
}

fn command_exists(command: &str) -> bool {
    let lookup = if cfg!(windows) { "where" } else { "which" };
    Command::new(lookup)
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn app_candidate_available(app: &InstalledApp) -> bool {
    if let Some(path) = &app.path {
        if Path::new(path).exists() {
            return true;
        }
    }
    command_exists(&app.command)
}

fn collect_start_menu_apps(apps: &mut Vec<InstalledApp>) {
    let mut roots = Vec::new();
    if let Ok(program_data) = std::env::var("ProgramData") {
        roots.push(PathBuf::from(program_data).join("Microsoft\\Windows\\Start Menu\\Programs"));
    }
    if let Ok(app_data) = std::env::var("AppData") {
        roots.push(PathBuf::from(app_data).join("Microsoft\\Windows\\Start Menu\\Programs"));
    }
    if let Ok(public) = std::env::var("PUBLIC") {
        roots.push(PathBuf::from(public).join("Desktop"));
    }
    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        roots.push(PathBuf::from(user_profile).join("Desktop"));
    }

    for root in roots {
        collect_shortcuts(&root, apps);
    }
}

fn collect_shortcuts(dir: &Path, apps: &mut Vec<InstalledApp>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_shortcuts(&path, apps);
            continue;
        }

        if path.extension().and_then(|value| value.to_str()) != Some("lnk") {
            continue;
        }

        let Some(stem) = path.file_stem().and_then(|value| value.to_str()) else {
            continue;
        };
        let id = format!("shortcut-{}", slug(stem));
        if apps.iter().any(|app| app.id == id) {
            continue;
        }
        let shortcut = path.to_string_lossy().to_string();
        apps.push(InstalledApp {
            id,
            name: stem.to_string(),
            command: "cmd".to_string(),
            args: vec!["{path}".to_string()],
            path: Some(shortcut),
            source: "start-menu".to_string(),
        });
    }
}

fn collect_mac_apps(apps: &mut Vec<InstalledApp>) {
    let mut roots = vec![
        PathBuf::from("/Applications"),
        PathBuf::from("/System/Applications"),
        PathBuf::from("/System/Applications/Utilities"),
    ];
    if let Ok(home) = std::env::var("HOME") {
        roots.push(PathBuf::from(home).join("Applications"));
    }

    for root in roots {
        let Ok(entries) = fs::read_dir(root) else { continue; };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("app") { continue; }
            let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else { continue; };
            let id = format!("mac-{}", slug(stem));
            if apps.iter().any(|app| app.id == id) { continue; }
            apps.push(InstalledApp {
                id,
                name: stem.to_string(),
                command: "open".to_string(),
                args: vec!["-a".to_string(), "{appPath}".to_string(), "{path}".to_string()],
                path: Some(path.to_string_lossy().to_string()),
                source: "macos".to_string(),
            });
        }
    }
}

fn collect_linux_apps(apps: &mut Vec<InstalledApp>) {
    let mut roots = vec![PathBuf::from("/usr/share/applications")];
    if let Ok(home) = std::env::var("HOME") {
        roots.push(PathBuf::from(home).join(".local/share/applications"));
    }
    for root in roots {
        let Ok(entries) = fs::read_dir(root) else { continue; };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("desktop") { continue; }
            if let Ok(content) = fs::read_to_string(&path) {
                let mut name = String::new();
                let mut exec = String::new();
                for line in content.lines() {
                    let line = line.trim();
                    if line.starts_with("Name=") && name.is_empty() {
                        name = line[5..].to_string();
                    } else if line.starts_with("Exec=") && exec.is_empty() {
                        let full_exec = line[5..].to_string();
                        exec = full_exec.split_whitespace().next().unwrap_or("").to_string();
                    }
                }
                if !name.is_empty() && !exec.is_empty() {
                    let id = format!("linux-{}", slug(&name));
                    if apps.iter().any(|app| app.id == id) { continue; }
                    apps.push(InstalledApp {
                        id,
                        name,
                        command: exec,
                        args: vec!["{path}".to_string()],
                        path: Some(path.to_string_lossy().to_string()),
                        source: "linux".to_string(),
                    });
                }
            }
        }
    }
}

fn app_from_id(apps: &[InstalledApp], id: &str) -> InstalledApp {
    apps.iter()
        .find(|app| app.id == id)
        .cloned()
        .unwrap_or_else(|| apps.first().cloned().unwrap_or_else(|| known_app_candidates()[0].clone()))
}

fn ps_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

#[allow(dead_code)]
fn sh_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}

fn shell_type_or_default(value: Option<&str>) -> &str {
    match value.unwrap_or("system") {
        "cmd" | "powershell" | "pwsh" | "bash" | "zsh" | "sh" => value.unwrap(),
        _ => "system",
    }
}

fn shell_command_and_args(shell_type: Option<&str>, command: &str) -> (String, Vec<String>) {
    match shell_type_or_default(shell_type) {
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
            } else if let Ok(user_shell) = std::env::var("SHELL") {
                (user_shell, vec!["-lc".to_string(), command.to_string()])
            } else {
                ("sh".to_string(), vec!["-lc".to_string(), command.to_string()])
            }
        }
    }
}

fn start_new_terminal(#[allow(unused_variables)] shell_type: Option<&str>, cwd: &Path, command: &str) -> Result<(), String> {
    let cwd_text = cwd.to_string_lossy().to_string();

    #[cfg(windows)]
    {
        let shell = shell_type_or_default(shell_type);
        if shell == "cmd" {
            Command::new("cmd")
                .args([
                    "/c",
                    "start",
                    "Command Window",
                    "cmd",
                    "/k",
                    &format!("cd /d \"{}\" && {}", cwd_text.replace('"', "\"\""), command),
                ])
                .spawn()
                .map_err(|error| error.to_string())?;
        } else {
            let (shell_command, shell_args) = shell_command_and_args(shell_type, command);
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
            if shell_args.is_empty() {
                return Ok(());
            }
            Command::new("cmd")
                .args(args)
                .spawn()
                .map_err(|error| error.to_string())?;
        }
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
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
        return Ok(());
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
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
            return process.spawn().map(|_| ()).map_err(|error| error.to_string());
        }

        return Err("No supported terminal application was found on this Linux system.".to_string());
    }

    #[allow(unreachable_code)]
    Err("Starting a terminal is not supported on this platform.".to_string())
}

fn browser_launch_command(browser: &str, url: &str) -> (String, Vec<String>) {
    #[cfg(windows)]
    {
        let command = match browser {
            "edge" => "msedge",
            "brave" => "brave",
            "comet" => "comet",
            "firefox" => "firefox",
            _ => "chrome",
        };
        return (
            "cmd".to_string(),
            vec![
                "/c".to_string(),
                "start".to_string(),
                "".to_string(),
                command.to_string(),
                url.to_string(),
            ],
        );
    }

    #[cfg(target_os = "macos")]
    {
        let app_name = match browser {
            "chrome" => Some("Google Chrome"),
            "edge" => Some("Microsoft Edge"),
            "brave" => Some("Brave Browser"),
            "firefox" => Some("Firefox"),
            "safari" => Some("Safari"),
            _ => None,
        };
        if let Some(app) = app_name {
            return (
                "open".to_string(),
                vec!["-a".to_string(), app.to_string(), url.to_string()],
            );
        }
        return ("open".to_string(), vec![url.to_string()]);
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let candidates = match browser {
            "chrome" => vec!["google-chrome", "chromium", "chromium-browser"],
            "edge" => vec!["microsoft-edge", "microsoft-edge-stable"],
            "brave" => vec!["brave-browser", "brave"],
            "firefox" => vec!["firefox"],
            _ => vec![],
        };
        if let Some(found) = candidates.into_iter().find(|candidate| command_exists(candidate)) {
            return (found.to_string(), vec![url.to_string()]);
        }
        return ("xdg-open".to_string(), vec![url.to_string()]);
    }

    #[allow(unreachable_code)]
    ("xdg-open".to_string(), vec![url.to_string()])
}

#[allow(dead_code)]
fn open_path_with_system(path: &str) -> Result<(), String> {
    if cfg!(windows) {
        Command::new("cmd")
            .args(["/c", "start", "", path])
            .spawn()
            .map(|_| ())
            .map_err(|error| error.to_string())
    } else if cfg!(target_os = "macos") {
        Command::new("open")
            .arg(path)
            .spawn()
            .map(|_| ())
            .map_err(|error| error.to_string())
    } else {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map(|_| ())
            .map_err(|error| error.to_string())
    }
}

fn resolve_working_directory(value: &str) -> Result<PathBuf, String> {
    let trimmed = value.trim();
    let path = if trimmed.is_empty() {
        std::env::current_dir().map_err(|error| error.to_string())?
    } else {
        PathBuf::from(trimmed)
    };

    if !path.exists() {
        return Err(format!("Working directory does not exist: {}", path.display()));
    }
    if !path.is_dir() {
        return Err(format!("Working directory is not a folder: {}", path.display()));
    }

    Ok(path)
}

fn ps_array(values: &[String]) -> String {
    if values.is_empty() {
        "@()".to_string()
    } else {
        format!(
            "@({})",
            values
                .iter()
                .map(|value| ps_quote(value))
                .collect::<Vec<_>>()
                .join(", ")
        )
    }
}

fn normalize_node(node: &mut Value, index: usize) {
    let fallback_id = format!("node_{}", index + 1);
    let node_id = node
        .get("id")
        .and_then(|value| value.as_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(&fallback_id)
        .to_string();

    if !node.is_object() {
        *node = json!({});
    }
    let object = node.as_object_mut().unwrap();
    object.insert("id".to_string(), json!(node_id.clone()));

    let mut data = object
        .remove("data")
        .filter(|value| value.is_object())
        .unwrap_or_else(|| json!({}));

    let node_type = data
        .get("type")
        .or_else(|| object.get("type"))
        .and_then(|value| value.as_str())
        .filter(|value| {
            matches!(
                *value,
                "openApp"
                    | "runCommand"
                    | "openBrowser"
                    | "delay"
                    | "editorTerminalCommand"
                    | "moveMouse"
                    | "mouseClick"
                    | "mouseDoubleClick"
                    | "mouseScroll"
                    | "typeText"
                    | "pressKey"
                    | "hotkey"
            )
        })
        .unwrap_or("runCommand")
        .to_string();

    if let Some(data_object) = data.as_object_mut() {
        data_object.insert("id".to_string(), json!(node_id));
        data_object.insert("type".to_string(), json!(node_type.clone()));
        if !data_object.contains_key("label") {
            data_object.insert("label".to_string(), json!(node_type.clone()));
        }
    }

    object.insert("type".to_string(), json!(node_type));
    object.insert("data".to_string(), data);

    if !object.get("position").is_some_and(|value| value.is_object()) {
        object.insert(
            "position".to_string(),
            json!({ "x": 80 + ((index as i32 % 3) * 280), "y": 90 + ((index as i32 / 3) * 180) }),
        );
    }
}

fn normalize_edge(edge: &mut Value, index: usize) {
    if !edge.is_object() {
        *edge = json!({});
    }
    let object = edge.as_object_mut().unwrap();
    if !object.get("id").and_then(|value| value.as_str()).is_some_and(|value| !value.trim().is_empty()) {
        object.insert("id".to_string(), json!(format!("edge_{}", index + 1)));
    }
    if !object.contains_key("animated") {
        object.insert("animated".to_string(), json!(true));
    }
}

fn normalize_generated_workflow(mut workflow: Workflow, prompt: &str, directory: &str) -> Workflow {
    let now = timestamp();
    workflow.id = Uuid::new_v4().to_string();
    if workflow.name.trim().is_empty() {
        workflow.name = Path::new(directory)
            .file_name()
            .and_then(|value| value.to_str())
            .map(|value| format!("{value} automation"))
            .unwrap_or_else(|| "Gemini workflow".to_string());
    }
    if workflow.description.trim().is_empty() {
        workflow.description = format!("Generated with Gemini from prompt: {prompt}");
    }
    workflow.favorite = false;
    workflow.created_at = now.clone();
    workflow.updated_at = now;
    if workflow.tags.is_empty() {
        workflow.tags = vec!["ai".to_string(), "generated".to_string()];
    }
    normalize_workflow(&mut workflow);
    workflow
}

#[derive(Debug, Clone, Serialize)]
struct DetectedPackage {
    rel_path: String,
    abs_path: String,
    name: Option<String>,
    dev_command: String,
    role_hint: String,
    likely_port: Option<u16>,
}

fn detect_role_and_port(pkg: &Value, folder_name: &str, dev_script: &str) -> (String, Option<u16>) {
    let mut deps: Vec<String> = Vec::new();
    for key in ["dependencies", "devDependencies", "peerDependencies"] {
        if let Some(map) = pkg.get(key).and_then(|value| value.as_object()) {
            for name in map.keys() {
                deps.push(name.to_lowercase());
            }
        }
    }
    let has = |name: &str| deps.iter().any(|dep| dep == name);

    let frontend_markers = ["react", "vite", "next", "vue", "svelte", "@angular/core", "solid-js"];
    let backend_markers = ["express", "fastify", "koa", "@nestjs/core", "hapi", "@hapi/hapi"];

    let mut role = "unknown".to_string();
    if frontend_markers.iter().any(|marker| has(marker)) {
        role = "frontend".to_string();
    } else if backend_markers.iter().any(|marker| has(marker)) {
        role = "backend".to_string();
    } else {
        let lower = folder_name.to_lowercase();
        if ["client", "web", "frontend", "ui", "app"].iter().any(|name| lower == *name) {
            role = "frontend".to_string();
        } else if ["server", "api", "backend"].iter().any(|name| lower == *name) {
            role = "backend".to_string();
        }
    }

    let mut port: Option<u16> = None;
    let parse = |needle: &str, sep: char, hay: &str| -> Option<u16> {
        hay.find(needle).and_then(|idx| {
            let rest = &hay[idx + needle.len()..];
            let rest = rest.trim_start_matches(sep);
            let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
            digits.parse().ok()
        })
    };
    port = port
        .or_else(|| parse("--port=", '=', dev_script))
        .or_else(|| parse("--port ", ' ', dev_script))
        .or_else(|| parse("-p ", ' ', dev_script))
        .or_else(|| parse("PORT=", '=', dev_script));

    if port.is_none() && role == "frontend" {
        if has("next") {
            port = Some(3000);
        } else if has("vite") {
            port = Some(5173);
        } else if has("react-scripts") {
            port = Some(3000);
        } else if has("@angular/core") {
            port = Some(4200);
        }
    }

    (role, port)
}

fn read_package(path: &Path, root: &Path) -> Option<DetectedPackage> {
    let raw = fs::read_to_string(path).ok()?;
    let pkg: Value = serde_json::from_str(&raw).ok()?;
    let scripts = pkg.get("scripts").and_then(|value| value.as_object());

    let chosen_script = ["dev", "develop", "start", "serve"]
        .iter()
        .find(|name| {
            scripts
                .map(|map| map.contains_key(**name))
                .unwrap_or(false)
        })
        .map(|name| name.to_string());

    let dev_script_value = chosen_script
        .as_ref()
        .and_then(|name| scripts.and_then(|map| map.get(name)))
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_string();

    let dev_command = match chosen_script.as_deref() {
        Some("start") => "npm start".to_string(),
        Some(name) => format!("npm run {name}"),
        None => "npm install".to_string(),
    };

    let dir = path.parent()?;
    let rel_path = dir
        .strip_prefix(root)
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .unwrap_or_default();
    let folder_name = dir
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_string();

    let (role, port) = detect_role_and_port(&pkg, &folder_name, &dev_script_value);

    Some(DetectedPackage {
        rel_path,
        abs_path: dir.to_string_lossy().to_string(),
        name: pkg
            .get("name")
            .and_then(|value| value.as_str())
            .map(|value| value.to_string()),
        dev_command,
        role_hint: role,
        likely_port: port,
    })
}

fn scan_project(root: &Path) -> Vec<DetectedPackage> {
    fn skip(name: &str) -> bool {
        matches!(
            name,
            "node_modules"
                | "dist"
                | "build"
                | ".git"
                | ".next"
                | ".turbo"
                | ".cache"
                | "target"
                | "out"
                | "coverage"
        )
    }

    fn walk(dir: &Path, root: &Path, depth: usize, found: &mut Vec<DetectedPackage>) {
        if depth > 3 || found.len() > 8 {
            return;
        }
        let pkg_path = dir.join("package.json");
        if pkg_path.is_file() {
            if let Some(pkg) = read_package(&pkg_path, root) {
                found.push(pkg);
            }
        }
        let Ok(entries) = fs::read_dir(dir) else {
            return;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
                continue;
            };
            if name.starts_with('.') || skip(name) {
                continue;
            }
            walk(&path, root, depth + 1, found);
        }
    }

    let mut found = Vec::new();
    walk(root, root, 0, &mut found);
    found
}

fn scan_summary(packages: &[DetectedPackage]) -> String {
    let mut lines = Vec::new();
    for (idx, pkg) in packages.iter().enumerate() {
        let rel = if pkg.rel_path.is_empty() {
            ".".to_string()
        } else {
            pkg.rel_path.clone()
        };
        let port = pkg
            .likely_port
            .map(|value| value.to_string())
            .unwrap_or_else(|| "none".to_string());
        let name = pkg.name.clone().unwrap_or_else(|| "unnamed".to_string());
        lines.push(format!(
            "  {}. relPath={} | role={} | name={} | devCommand=\"{}\" | absPath={} | likelyPort={}",
            idx + 1,
            rel,
            pkg.role_hint,
            name,
            pkg.dev_command,
            pkg.abs_path.replace('\\', "\\\\"),
            port
        ));
    }
    lines.join("\n")
}

#[allow(dead_code)]
fn workflow_generation_prompt_with_scan(
    prompt: &str,
    directory: &str,
    app: &InstalledApp,
    packages: &[DetectedPackage],
    preferred_browser: &str,
) -> String {
    let frontend_port = packages
        .iter()
        .find(|pkg| pkg.role_hint == "frontend" && pkg.likely_port.is_some())
        .and_then(|pkg| pkg.likely_port)
        .or_else(|| {
            packages
                .iter()
                .find_map(|pkg| pkg.likely_port)
        });
    let frontend_url = frontend_port
        .map(|port| format!("http://localhost:{port}"))
        .unwrap_or_else(|| "http://localhost:3000".to_string());
    let summary = scan_summary(packages);
    let user_hint = if prompt.trim().is_empty() {
        "Set up the project so I can start developing immediately.".to_string()
    } else {
        prompt.to_string()
    };

    format!(
        r#"Create one Advflow workflow as strict JSON only. No markdown.

Use this TypeScript shape:
{{
  "name": "string",
  "description": "string",
  "favorite": false,
  "tags": ["ai", "gemini", "from-folder"],
  "nodes": [
    {{
      "id": "node_open_app",
      "type": "openApp",
      "position": {{ "x": 80, "y": 80 }},
      "data": {{
        "id": "node_open_app",
        "type": "openApp",
        "label": "Open editor",
        "appId": "{app_id}",
        "appName": "{app_name}",
        "command": "{command}",
        "args": {args},
        "appPath": {app_path},
        "source": "{source}",
        "folderPath": "{directory}"
      }}
    }}
  ],
  "edges": [{{ "id": "edge_id", "source": "node_a", "target": "node_b", "animated": true }}]
}}

Allowed node data types:
openApp: appId, appName, command, args, appPath, source, folderPath, label.
runCommand: command, workingDirectory, terminalType ("background" or "newWindow"), shellType ("powershell" or "cmd"), label.
openBrowser: url, browser ("chrome", "edge", "brave", "comet"), waitMode ("delay" or "waitForServer"), delay, label.
delay: delay, waitUrl, label.

Project structure (scanned package.json files under "{directory}"):
{summary}

Strict rules:
- First node MUST be the openApp node above (open the project root in the editor).
- For EACH detected package above, emit ONE runCommand node:
    * workingDirectory = the package's absPath (use double-backslash on Windows paths exactly as shown).
    * command = the package's devCommand.
    * terminalType = "newWindow", shellType = "powershell".
    * label = "Run <role>: <relPath or name>".
- If at least one package has role=frontend, add ONE openBrowser node AFTER all runCommand nodes:
    * url = "{frontend_url}".
    * browser = "{preferred_browser}".
    * waitMode = "waitForServer", delay = 30000.
    * label = "Open in browser".
- End with ONE delay node: label = "Ready", delay = 500.
- Connect nodes top-to-bottom with edges, all animated: true. Each edge: {{ "id": "edge_<n>", "source": "<prev_id>", "target": "<next_id>", "animated": true }}.
- Lay out node positions vertically: x=80, y=80, 180, 280, ... (step 100).
- Keep IDs simple, unique, snake_case.
- Return valid JSON only.

User hint: {user_hint}"#,
        app_id = app.id,
        app_name = app.name.replace('"', "'"),
        command = app.command.replace('"', "'"),
        args = serde_json::to_string(&app.args).unwrap_or_else(|_| "[]".to_string()),
        app_path = serde_json::to_string(&app.path).unwrap_or_else(|_| "null".to_string()),
        source = app.source,
        directory = directory.replace('\\', "\\\\").replace('"', "'"),
        summary = summary,
        frontend_url = frontend_url,
        preferred_browser = preferred_browser,
        user_hint = user_hint
    )
}

fn workflow_generation_prompt(prompt: &str, directory: &str, app: &InstalledApp) -> String {
    format!(
        r#"Create one Advflow workflow as strict JSON only. No markdown.

Use this TypeScript shape:
{{
  "name": "string",
  "description": "string",
  "favorite": false,
  "tags": ["ai", "generated"],
  "nodes": [
    {{
      "id": "node_open_app",
      "type": "openApp",
      "position": {{ "x": 80, "y": 80 }},
      "data": {{
        "id": "node_open_app",
        "type": "openApp",
        "label": "Open app",
        "appId": "{app_id}",
        "appName": "{app_name}",
        "command": "{command}",
        "args": {args},
        "appPath": {app_path},
        "source": "{source}",
        "folderPath": "{directory}"
      }}
    }}
  ],
  "edges": [{{ "id": "edge_id", "source": "node_a", "target": "node_b", "animated": true }}]
}}

Allowed node data types:
openApp: appId, appName, command, args, appPath, source, folderPath, label.
runCommand: command, workingDirectory, terminalType ("background" or "newWindow"), shellType ("powershell" or "cmd"), label.
openBrowser: url, browser ("chrome", "edge", "brave", "comet"), waitMode ("delay" or "waitForServer"), delay, label.
delay: delay, waitUrl, label.
editorTerminalCommand: command, terminalHotkey, submit, label.

Rules:
- Always include an openApp node first using the supplied app fields.
- Use "{directory}" as folderPath and workingDirectory.
- If it is a Node/package project, prefer npm commands.
- Keep IDs simple and unique.
- Return valid JSON only.

User prompt: {prompt}"#,
        app_id = app.id,
        app_name = app.name.replace('"', "'"),
        command = app.command.replace('"', "'"),
        args = serde_json::to_string(&app.args).unwrap_or_else(|_| "[]".to_string()),
        app_path = serde_json::to_string(&app.path).unwrap_or_else(|_| "null".to_string()),
        source = app.source,
        directory = directory.replace('\\', "\\\\").replace('"', "'"),
        prompt = prompt
    )
}

async fn call_gemini_for_workflow(
    settings: &AppSettings,
    prompt_text: String,
) -> Result<Workflow, String> {
    let api_key = if settings.gemini_api_key.trim().is_empty() {
        std::env::var("GEMINI_API_KEY").unwrap_or_default()
    } else {
        settings.gemini_api_key.clone()
    };

    if api_key.trim().is_empty() {
        return Err("Add a Gemini API key in Settings or set GEMINI_API_KEY.".to_string());
    }

    let model = settings.gemini_model.trim();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    );
    let body = json!({
        "contents": [{
            "parts": [{ "text": prompt_text }]
        }],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
            "responseJsonSchema": {
                "type": "object",
                "properties": {
                    "name": { "type": "string" },
                    "description": { "type": "string" },
                    "favorite": { "type": "boolean" },
                    "tags": { "type": "array", "items": { "type": "string" } },
                    "nodes": { "type": "array", "items": { "type": "object" } },
                    "edges": { "type": "array", "items": { "type": "object" } }
                },
                "required": ["name", "description", "favorite", "tags", "nodes", "edges"]
            }
        }
    });

    eprintln!("\n===== Gemini request =====\nmodel: {model}\nprompt:\n{}\n===== end prompt =====\n", body["contents"][0]["parts"][0]["text"].as_str().unwrap_or(""));

    let client = reqwest::Client::new();
    let raw = client
        .post(url)
        .header("x-goog-api-key", api_key)
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("Gemini request failed: {error}"))?
        .text()
        .await
        .map_err(|error| format!("Gemini response read failed: {error}"))?;

    eprintln!("\n===== Gemini raw response =====\n{raw}\n===== end response =====\n");

    let response: Value = serde_json::from_str(&raw)
        .map_err(|error| format!("Gemini response was not JSON: {error} | body: {raw}"))?;

    let text = response
        .pointer("/candidates/0/content/parts/0/text")
        .and_then(|value| value.as_str())
        .ok_or_else(|| format!("Gemini did not return workflow JSON: {response}"))?;

    eprintln!("\n===== Gemini workflow JSON =====\n{text}\n===== end workflow JSON =====\n");

    serde_json::from_str(&extract_json_text(text))
        .map_err(|error| format!("Gemini returned invalid workflow JSON: {error} | text: {text}"))
}

async fn call_ai_for_workflow(settings: &AppSettings, prompt_text: String) -> Result<Workflow, String> {
    if settings.ai_provider == "local" {
        let text = call_local_model_json(settings, &prompt_text, "workflow generation").await?;
        serde_json::from_str(&text)
            .map_err(|error| format!("Local model returned invalid workflow JSON: {error} | text: {text}"))
    } else {
        call_gemini_for_workflow(settings, prompt_text).await
    }
}

async fn generate_workflow_with_gemini(
    settings: &AppSettings,
    prompt: &str,
    directory: &str,
    app: &InstalledApp,
) -> Result<Workflow, String> {
    let workflow = call_ai_for_workflow(
        settings,
        workflow_generation_prompt(prompt, directory, app),
    )
    .await?;
    Ok(normalize_generated_workflow(workflow, prompt, directory))
}

fn build_workflow_from_scan(
    directory: &str,
    app: &InstalledApp,
    packages: &[DetectedPackage],
    preferred_browser: &str,
    name_hint: Option<String>,
    description_hint: Option<String>,
) -> Workflow {
    let mut nodes: Vec<Value> = Vec::new();
    let mut edges: Vec<Value> = Vec::new();
    #[allow(unused_assignments)]
    let mut prev_id: Option<String> = None;
    let mut y: i32 = 80;
    let step: i32 = 110;
    let x: i32 = 80;

    let push_edge = |edges: &mut Vec<Value>, prev: &Option<String>, next: &str| {
        if let Some(prev_id) = prev {
            edges.push(json!({
                "id": format!("edge_{}_{}", prev_id, next),
                "source": prev_id,
                "target": next,
                "animated": true,
            }));
        }
    };

    let editor_id = "node_open_editor".to_string();
    nodes.push(json!({
        "id": editor_id,
        "type": "openApp",
        "position": { "x": x, "y": y },
        "data": {
            "id": editor_id,
            "type": "openApp",
            "label": format!("Open {} at project root", app.name),
            "appId": app.id,
            "appName": app.name,
            "command": app.command,
            "args": app.args,
            "appPath": app.path,
            "source": app.source,
            "folderPath": directory,
        },
    }));
    prev_id = Some(editor_id);
    y += step;

    for (idx, pkg) in packages.iter().enumerate() {
        let id = format!("node_run_{}", idx + 1);
        let label_path = if pkg.rel_path.is_empty() { ".".to_string() } else { pkg.rel_path.clone() };
        let label = format!(
            "Run {} ({})",
            pkg.role_hint,
            pkg.name.clone().unwrap_or(label_path),
        );
        nodes.push(json!({
            "id": id,
            "type": "runCommand",
            "position": { "x": x, "y": y },
            "data": {
                "id": id,
                "type": "runCommand",
                "label": label,
                "command": pkg.dev_command,
                "workingDirectory": pkg.abs_path,
                "terminalType": "newWindow",
                "shellType": "powershell",
            },
        }));
        push_edge(&mut edges, &prev_id, &id);
        prev_id = Some(id);
        y += step;
    }

    let frontend_port = packages
        .iter()
        .find(|pkg| pkg.role_hint == "frontend" && pkg.likely_port.is_some())
        .and_then(|pkg| pkg.likely_port)
        .or_else(|| packages.iter().find_map(|pkg| pkg.likely_port));

    if let Some(port) = frontend_port {
        let id = "node_open_browser".to_string();
        nodes.push(json!({
            "id": id,
            "type": "openBrowser",
            "position": { "x": x, "y": y },
            "data": {
                "id": id,
                "type": "openBrowser",
                "label": format!("Open http://localhost:{port}"),
                "url": format!("http://localhost:{port}"),
                "browser": preferred_browser,
                "waitMode": "waitForServer",
                "delay": 30000,
            },
        }));
        push_edge(&mut edges, &prev_id, &id);
        prev_id = Some(id);
        y += step;
    }

    let ready_id = "node_ready".to_string();
    nodes.push(json!({
        "id": ready_id,
        "type": "delay",
        "position": { "x": x, "y": y },
        "data": {
            "id": ready_id,
            "type": "delay",
            "label": "Ready",
            "delay": 500,
        },
    }));
    push_edge(&mut edges, &prev_id, &ready_id);

    let folder_name = Path::new(directory)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("project")
        .to_string();

    let mut workflow = Workflow {
        id: Uuid::new_v4().to_string(),
        name: name_hint.unwrap_or_else(|| format!("{folder_name} dev")),
        description: description_hint.unwrap_or_else(|| {
            format!(
                "Open {} in {}, run {} dev script(s), open browser when server is ready.",
                folder_name,
                app.name,
                packages.len()
            )
        }),
        favorite: false,
        kind: "desktop".to_string(),
        base_app_id: String::new(),
        entry_hotkey: String::new(),
        nodes,
        edges,
        tags: vec![
            "ai".to_string(),
            "from-folder".to_string(),
        ],
        created_at: timestamp(),
        updated_at: timestamp(),
    };
    normalize_workflow(&mut workflow);
    workflow
}

async fn ai_name_and_description(
    settings: &AppSettings,
    directory: &str,
    user_hint: &str,
    packages: &[DetectedPackage],
) -> Option<(String, String)> {
    if settings.ai_provider == "gemini"
        && settings.gemini_api_key.trim().is_empty()
        && std::env::var("GEMINI_API_KEY").unwrap_or_default().trim().is_empty()
    {
        return None;
    }

    let summary = scan_summary(packages);
    let prompt_text = format!(
        r#"Pick a short workflow name and one-sentence description for an Advflow dev-startup workflow.

Project folder: {directory}
User hint: {user_hint}
Detected packages:
{summary}

Return JSON: {{ "name": "...", "description": "..." }}"#
    );

    let raw_text = if settings.ai_provider == "local" {
        call_local_model_json(settings, &prompt_text, "workflow naming").await.ok()?
    } else {
        let api_key = if settings.gemini_api_key.trim().is_empty() {
            std::env::var("GEMINI_API_KEY").unwrap_or_default()
        } else {
            settings.gemini_api_key.clone()
        };
        let model = settings.gemini_model.trim();
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        );
        let body = json!({
            "contents": [{ "parts": [{ "text": prompt_text }] }],
            "generationConfig": {
                "temperature": 0.4,
                "responseMimeType": "application/json",
                "responseJsonSchema": {
                    "type": "object",
                    "properties": {
                        "name": { "type": "string" },
                        "description": { "type": "string" }
                    },
                    "required": ["name", "description"]
                }
            }
        });

        let raw = reqwest::Client::new()
            .post(url)
            .header("x-goog-api-key", api_key)
            .json(&body)
            .send()
            .await
            .ok()?
            .text()
            .await
            .ok()?;

        let response: Value = serde_json::from_str(&raw).ok()?;
        extract_json_text(
            response
                .pointer("/candidates/0/content/parts/0/text")
                .and_then(|value| value.as_str())?,
        )
    };

    let parsed: Value = serde_json::from_str(&raw_text).ok()?;
    let name = parsed.get("name").and_then(|value| value.as_str())?.to_string();
    let description = parsed
        .get("description")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_string();
    if name.trim().is_empty() {
        return None;
    }
    Some((name, description))
}

async fn generate_workflow_from_scan(
    settings: &AppSettings,
    prompt: &str,
    directory: &str,
    app: &InstalledApp,
    packages: &[DetectedPackage],
) -> Result<Workflow, String> {
    eprintln!(
        "\n===== Folder scan =====\ndirectory: {directory}\npackages found: {}\n{}\n===== end scan =====\n",
        packages.len(),
        scan_summary(packages)
    );

    let (name_hint, description_hint) = match ai_name_and_description(
        settings, directory, prompt, packages,
    )
    .await
    {
        Some((name, description)) => (Some(name), Some(description)),
        None => (None, None),
    };

    Ok(build_workflow_from_scan(
        directory,
        app,
        packages,
        &settings.preferred_browser,
        name_hint,
        description_hint,
    ))
}

async fn update_node_with_ai(
    settings: &AppSettings,
    prompt: &str,
    node: &Value,
    directory: &str,
) -> Result<Value, String> {
    let instruction = format!(
        "Edit this Advflow ReactFlow node according to the prompt. Return the full node JSON only. Keep node.id, node.type, and position unless the prompt explicitly requires otherwise. Directory to use when relevant: {directory}\nPrompt: {prompt}\nNode JSON: {node}",
        node = serde_json::to_string_pretty(node).unwrap_or_else(|_| "{}".to_string())
    );

    let text = if settings.ai_provider == "local" {
        call_local_model_json(settings, &instruction, "node editing").await?
    } else {
        let api_key = if settings.gemini_api_key.trim().is_empty() {
            std::env::var("GEMINI_API_KEY").unwrap_or_default()
        } else {
            settings.gemini_api_key.clone()
        };

        if api_key.trim().is_empty() {
            return Err("Add a Gemini API key in Settings or set GEMINI_API_KEY.".to_string());
        }

        let model = settings.gemini_model.trim();
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        );
        let body = json!({
            "contents": [{ "parts": [{ "text": instruction }] }],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
                "responseJsonSchema": { "type": "object" }
            }
        });

        let response: Value = reqwest::Client::new()
            .post(url)
            .header("x-goog-api-key", api_key)
            .json(&body)
            .send()
            .await
            .map_err(|error| format!("Gemini request failed: {error}"))?
            .json()
            .await
            .map_err(|error| format!("Gemini response was not JSON: {error}"))?;

        extract_json_text(
            response
                .pointer("/candidates/0/content/parts/0/text")
                .and_then(|value| value.as_str())
                .ok_or_else(|| format!("Gemini did not return node JSON: {response}"))?,
        )
    };
    serde_json::from_str(&text).map_err(|error| format!("AI returned invalid node JSON: {error}"))
}

fn run_command_node(data: &Value, timeout_seconds: u32) -> Result<String, String> {
    let command = data.get("command").and_then(|value| value.as_str()).unwrap_or("");
    if command.trim().is_empty() {
        return Err("Command is empty".to_string());
    }

    let working_directory_input = data
        .get("workingDirectory")
        .and_then(|value| value.as_str())
        .unwrap_or(".");
    let working_directory = resolve_working_directory(working_directory_input)?;
    let shell = data.get("shellType").and_then(|value| value.as_str());
    let terminal_type = data
        .get("terminalType")
        .and_then(|value| value.as_str())
        .unwrap_or("background");

    if terminal_type == "newWindow" {
        start_new_terminal(shell, &working_directory, command)?;
        return Ok("Opened command in a new terminal window.".to_string());
    }

    let (shell_command, shell_args) = shell_command_and_args(shell, command);
    let mut process = Command::new(shell_command);
    process.args(shell_args);
    process.current_dir(&working_directory);
    let output = process.output().map_err(|error| error.to_string())?;
    if output.status.success() {
        Ok(format!(
            "Command completed within configured timeout target of {timeout_seconds}s."
        ))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn open_app_node(data: &Value) -> Result<String, String> {
    let command = data.get("command").and_then(|value| value.as_str()).unwrap_or("");
    let app_path = data.get("appPath").and_then(|value| value.as_str()).unwrap_or("");
    if command.trim().is_empty() && app_path.trim().is_empty() {
        return Err("No app command selected".to_string());
    }

    let folder_path = data.get("folderPath").and_then(|value| value.as_str()).unwrap_or("");
    let args: Vec<String> = data
        .get("args")
        .and_then(|value| value.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| {
                    item.as_str().map(|arg| {
                        arg.replace("{path}", folder_path)
                            .replace("{appPath}", app_path)
                    })
                })
                .filter(|arg| !arg.trim().is_empty())
                .collect()
        })
        .unwrap_or_else(|| {
            if folder_path.trim().is_empty() {
                Vec::new()
            } else {
                vec![folder_path.to_string()]
            }
        });

    let file = if app_path.trim().is_empty() { command } else { app_path };
    #[cfg(windows)]
    if file.to_lowercase().ends_with(".lnk") {
        let mut start_args = vec![
            "/c".to_string(),
            "start".to_string(),
            "".to_string(),
            file.to_string(),
        ];
        start_args.extend(args);
        Command::new("cmd")
            .args(start_args)
            .spawn()
            .map_err(|error| error.to_string())?;
        return Ok("Application launch requested.".to_string());
    }

    #[cfg(windows)]
    {
        let script = if args.is_empty() {
            format!("Start-Process -FilePath {}", ps_quote(file))
        } else {
            format!(
                "Start-Process -FilePath {} -ArgumentList {}",
                ps_quote(file),
                ps_array(&args),
            )
        };
        Command::new("powershell")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script])
            .spawn()
            .map_err(|error| error.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        if file.ends_with(".app") || command == "open" {
            let mut process = Command::new("open");
            if file.ends_with(".app") {
                process.arg("-a").arg(file);
            }
            process.args(&args).spawn().map_err(|error| error.to_string())?;
        } else if Path::new(file).exists() || command_exists(file) {
            Command::new(file)
                .args(&args)
                .spawn()
                .map_err(|error| error.to_string())?;
        } else {
            open_path_with_system(file)?;
        }
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        if Path::new(file).exists() || command_exists(file) {
            Command::new(file)
                .args(&args)
                .spawn()
                .map_err(|error| error.to_string())?;
        } else if !folder_path.trim().is_empty() {
            open_path_with_system(folder_path)?;
        } else {
            open_path_with_system(file)?;
        }
    }
    Ok("Application launch requested.".to_string())
}

fn open_browser_node(data: &Value) -> Result<String, String> {
    let url = data.get("url").and_then(|value| value.as_str()).unwrap_or("");
    if url.trim().is_empty() {
        return Err("URL is empty".to_string());
    }
    let browser = data.get("browser").and_then(|value| value.as_str()).unwrap_or("system");
    let (command, args) = browser_launch_command(browser, url);
    Command::new(command)
        .args(args)
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(format!("Opened {url}"))
}

fn editor_terminal_command_node(data: &Value) -> Result<String, String> {
    let command = data.get("command").and_then(|value| value.as_str()).unwrap_or("").trim();
    if command.is_empty() {
        return Err("Terminal command is empty".to_string());
    }

    let hotkey = data
        .get("terminalHotkey")
        .and_then(|value| value.as_str())
        .unwrap_or("ctrl+shift+`");
    let terminal_ready_delay_ms = data
        .get("terminalReadyDelayMs")
        .and_then(|value| value.as_u64())
        .unwrap_or(1000)
        .max(1000);
    let submit = data.get("submit").and_then(|value| value.as_bool()).unwrap_or(true);

    let hotkey_parts = hotkey
        .split('+')
        .map(|part| part.trim().to_string())
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();

    macro_engine::hotkey(hotkey_parts)?;
    macro_engine::wait_ms(terminal_ready_delay_ms)?;
    macro_engine::type_text(command.to_string())?;
    if submit {
        macro_engine::press_key("enter".to_string())?;
    }

    Ok(format!("Sent integrated terminal command: {command}"))
}

fn move_mouse_node(data: &Value) -> Result<String, String> {
    let x = data.get("x").and_then(|value| value.as_i64()).unwrap_or(0) as i32;
    let y = data.get("y").and_then(|value| value.as_i64()).unwrap_or(0) as i32;
    macro_engine::move_mouse(x, y)?;
    Ok(format!("Moved cursor to {x}, {y}"))
}

fn mouse_click_node(data: &Value) -> Result<String, String> {
    let button = data.get("button").and_then(|value| value.as_str()).unwrap_or("left").to_string();
    macro_engine::mouse_click(button.clone())?;
    Ok(format!("Clicked {button} mouse button"))
}

fn mouse_double_click_node(data: &Value) -> Result<String, String> {
    let button = data.get("button").and_then(|value| value.as_str()).unwrap_or("left").to_string();
    macro_engine::mouse_double_click(button.clone())?;
    Ok(format!("Double clicked {button} mouse button"))
}

fn mouse_scroll_node(data: &Value) -> Result<String, String> {
    let amount = data.get("amount").and_then(|value| value.as_i64()).unwrap_or(-1) as i32;
    macro_engine::mouse_scroll(amount)?;
    Ok(format!("Scrolled by {amount}"))
}

fn type_text_node(data: &Value) -> Result<String, String> {
    let text = data.get("text").and_then(|value| value.as_str()).unwrap_or("").to_string();
    if text.is_empty() {
        return Err("Text is empty".to_string());
    }
    macro_engine::type_text(text.clone())?;
    Ok(format!("Typed {} characters", text.chars().count()))
}

fn press_key_node(data: &Value) -> Result<String, String> {
    let key = data.get("key").and_then(|value| value.as_str()).unwrap_or("").to_string();
    if key.trim().is_empty() {
        return Err("Key is empty".to_string());
    }
    macro_engine::press_key(key.clone())?;
    Ok(format!("Pressed key {key}"))
}

fn hotkey_node(data: &Value) -> Result<String, String> {
    let keys = data
        .get("keys")
        .and_then(|value| value.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(|value| value.to_string()))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    if keys.is_empty() {
        return Err("Hotkey needs at least one key".to_string());
    }
    macro_engine::hotkey(keys.clone())?;
    Ok(format!("Sent hotkey {}", keys.join("+")))
}

fn execute_node(node: &Value, settings: &AppSettings) -> Result<String, String> {
    let data = node.get("data").unwrap_or(node);
    match data.get("type").and_then(|value| value.as_str()).unwrap_or("") {
        "openApp" => open_app_node(data),
        "runCommand" => run_command_node(data, settings.command_timeout_seconds),
        "openBrowser" => open_browser_node(data),
        "editorTerminalCommand" => editor_terminal_command_node(data),
        "moveMouse" => move_mouse_node(data),
        "mouseClick" => mouse_click_node(data),
        "mouseDoubleClick" => mouse_double_click_node(data),
        "mouseScroll" => mouse_scroll_node(data),
        "typeText" => type_text_node(data),
        "pressKey" => press_key_node(data),
        "hotkey" => hotkey_node(data),
        "delay" => {
            let delay = data.get("delay").and_then(|value| value.as_u64()).unwrap_or(1000);
            std::thread::sleep(std::time::Duration::from_millis(delay.min(60_000)));
            Ok(format!("Waited {delay}ms"))
        }
        node_type => Err(format!("Unsupported node type: {node_type}")),
    }
}

fn extract_json_text(raw: &str) -> String {
    let trimmed = raw.trim();
    if let Some(stripped) = trimmed.strip_prefix("```json") {
        return stripped
            .trim()
            .trim_end_matches("```")
            .trim()
            .to_string();
    }
    if let Some(stripped) = trimmed.strip_prefix("```") {
        return stripped
            .trim()
            .trim_end_matches("```")
            .trim()
            .to_string();
    }
    trimmed.to_string()
}

fn local_model_endpoint(settings: &AppSettings) -> String {
    settings
        .local_model_endpoint
        .trim()
        .trim_end_matches('/')
        .to_string()
}

fn local_model_name(settings: &AppSettings) -> Result<String, String> {
    let model = settings.local_model_name.trim();
    if model.is_empty() {
        Err("Pick a local model in Settings before generating workflows.".to_string())
    } else {
        Ok(model.to_string())
    }
}

async fn call_local_model_json(
    settings: &AppSettings,
    prompt_text: &str,
    purpose: &str,
) -> Result<String, String> {
    let endpoint = local_model_endpoint(settings);
    let model = local_model_name(settings)?;
    let url = format!("{endpoint}/chat/completions");

    let client = reqwest::Client::new();
    let mut request = client.post(url).json(&json!({
        "model": model,
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": format!("You are Advflow's workflow generation assistant. Return only valid JSON for {purpose}.")
            },
            {
                "role": "user",
                "content": prompt_text
            }
        ]
    }));

    if !settings.local_model_api_key.trim().is_empty() {
        request = request.bearer_auth(settings.local_model_api_key.trim());
    }

    let response = request
        .send()
        .await
        .map_err(|error| format!("Local model request failed: {error}"))?;
    let raw = response
        .text()
        .await
        .map_err(|error| format!("Local model response read failed: {error}"))?;
    let json: Value = serde_json::from_str(&raw)
        .map_err(|error| format!("Local model response was not JSON: {error} | body: {raw}"))?;
    let content = json
        .get("choices")
        .and_then(|value| value.as_array())
        .and_then(|items| items.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(|value| value.as_str())
        .ok_or_else(|| format!("Local model did not return message content: {json}"))?;
    Ok(extract_json_text(content))
}

#[cfg(windows)]
fn parse_hotkey_keys(hotkey: &str) -> Vec<String> {
    hotkey
        .split('+')
        .map(|part| part.trim().to_ascii_lowercase())
        .filter(|part| !part.is_empty())
        .collect()
}

#[cfg(windows)]
fn modifier_vk(key: &str) -> Option<i32> {
    match key {
        "ctrl" | "control" => Some(VK_CONTROL.0 as i32),
        "shift" => Some(VK_SHIFT.0 as i32),
        "alt" => Some(VK_MENU.0 as i32),
        "win" | "meta" | "super" => Some(VK_LWIN.0 as i32),
        _ => None,
    }
}

#[cfg(windows)]
fn primary_vk(key: &str) -> Option<i32> {
    match key {
        "enter" | "return" => Some(VK_RETURN.0 as i32),
        "tab" => Some(VK_TAB.0 as i32),
        "space" => Some(VK_SPACE.0 as i32),
        "`" | "backquote" | "grave" => Some(0xC0),
        "f1" => Some(VK_F1.0 as i32),
        "f2" => Some(VK_F2.0 as i32),
        "f3" => Some(VK_F3.0 as i32),
        "f4" => Some(VK_F4.0 as i32),
        "f5" => Some(VK_F5.0 as i32),
        "f6" => Some(VK_F6.0 as i32),
        "f7" => Some(VK_F7.0 as i32),
        "f8" => Some(VK_F8.0 as i32),
        "f9" => Some(VK_F9.0 as i32),
        "f10" => Some(VK_F10.0 as i32),
        "f11" => Some(VK_F11.0 as i32),
        "f12" => Some(VK_F12.0 as i32),
        _ if key.len() == 1 => key.chars().next().map(|ch| ch.to_ascii_uppercase() as i32),
        _ => None,
    }
}

#[cfg(windows)]
fn is_vk_pressed(vk: i32) -> bool {
    unsafe { GetAsyncKeyState(vk) < 0 }
}

#[cfg(windows)]
fn hotkey_is_pressed(hotkey: &str) -> bool {
    let parts = parse_hotkey_keys(hotkey);
    if parts.is_empty() {
        return false;
    }

    let mut main_key = None;
    for part in &parts {
        if let Some(vk) = modifier_vk(part) {
            if !is_vk_pressed(vk) {
                return false;
            }
        } else if let Some(vk) = primary_vk(part) {
            main_key = Some(vk);
        } else {
            return false;
        }
    }

    main_key.is_some_and(is_vk_pressed)
}

#[cfg(not(windows))]
fn is_vk_pressed(key_name: &str) -> bool {
    use device_query::{DeviceQuery, DeviceState, Keycode};
    let device_state = DeviceState::new();
    let keys = device_state.get_keys();
    
    let target = match key_name.to_lowercase().as_str() {
        "ctrl" | "control" => Keycode::LControl,
        "alt" | "menu" => Keycode::LAlt,
        "shift" => Keycode::LShift,
        "win" | "command" | "meta" => Keycode::LMeta,
        "enter" | "return" => Keycode::Enter,
        "space" => Keycode::Space,
        "tab" => Keycode::Tab,
        "f1" => Keycode::F1,
        "f2" => Keycode::F2,
        "f3" => Keycode::F3,
        "f4" => Keycode::F4,
        "f5" => Keycode::F5,
        "f6" => Keycode::F6,
        "f7" => Keycode::F7,
        "f8" => Keycode::F8,
        "f9" => Keycode::F9,
        "f10" => Keycode::F10,
        "f11" => Keycode::F11,
        "f12" => Keycode::F12,
        other if other.len() == 1 => {
            let ch = other.chars().next().unwrap().to_ascii_uppercase();
            match ch {
                'A' => Keycode::A, 'B' => Keycode::B, 'C' => Keycode::C, 'D' => Keycode::D,
                'E' => Keycode::E, 'F' => Keycode::F, 'G' => Keycode::G, 'H' => Keycode::H,
                'I' => Keycode::I, 'J' => Keycode::J, 'K' => Keycode::K, 'L' => Keycode::L,
                'M' => Keycode::M, 'N' => Keycode::N, 'O' => Keycode::O, 'P' => Keycode::P,
                'Q' => Keycode::Q, 'R' => Keycode::R, 'S' => Keycode::S, 'T' => Keycode::T,
                'U' => Keycode::U, 'V' => Keycode::V, 'W' => Keycode::W, 'X' => Keycode::X,
                'Y' => Keycode::Y, 'Z' => Keycode::Z,
                '0' => Keycode::Key0, '1' => Keycode::Key1, '2' => Keycode::Key2, '3' => Keycode::Key3,
                '4' => Keycode::Key4, '5' => Keycode::Key5, '6' => Keycode::Key6, '7' => Keycode::Key7,
                '8' => Keycode::Key8, '9' => Keycode::Key9,
                _ => return false,
            }
        }
        _ => return false,
    };
    
    keys.contains(&target)
}

#[cfg(not(windows))]
fn hotkey_is_pressed(hotkey: &str) -> bool {
    let parts: Vec<&str> = hotkey.split('+').map(|s| s.trim()).collect();
    if parts.is_empty() {
        return false;
    }

    for part in parts {
        if !is_vk_pressed(part) {
            return false;
        }
    }
    true
}



#[cfg(windows)]
fn foreground_process_name() -> Option<String> {
    let hwnd: HWND = unsafe { GetForegroundWindow() };
    if hwnd.0.is_null() {
        return None;
    }

    let mut process_id = 0u32;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut process_id)) };
    if process_id == 0 {
        return None;
    }

    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id).ok()? };
    let mut buffer = vec![0u16; 260];
    let mut size = buffer.len() as u32;
    let result = unsafe {
        QueryFullProcessImageNameW(
            handle,
            windows::Win32::System::Threading::PROCESS_NAME_FORMAT(0),
            windows::core::PWSTR(buffer.as_mut_ptr()),
            &mut size,
        )
    };
    let _ = unsafe { CloseHandle(handle) };
    if result.is_err() {
        return None;
    }

    let path = String::from_utf16_lossy(&buffer[..size as usize]);
    Path::new(&path)
        .file_stem()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
}

#[cfg(not(windows))]
fn foreground_process_name() -> Option<String> {
    if cfg!(target_os = "macos") {
        let output = Command::new("osascript")
            .args(["-e", "tell application \"System Events\" to get name of first process whose frontmost is true"])
            .output()
            .ok()?;
        
        let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if name.is_empty() { None } else { Some(name.to_lowercase()) }
    } else if cfg!(target_os = "linux") {
        // Try xprop (X11)
        let output = Command::new("sh")
            .arg("-c")
            .arg("xprop -id $(xprop -root _NET_ACTIVE_WINDOW | cut -d ' ' -f 5) WM_CLASS | cut -d '\"' -f 4")
            .output()
            .ok()?;
            
        let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if name.is_empty() { None } else { Some(name.to_lowercase()) }
    } else {
        None
    }
}



fn app_match_tokens(app: &InstalledApp) -> Vec<String> {
    let mut tokens = vec![app.id.to_ascii_lowercase(), app.name.to_ascii_lowercase(), app.command.to_ascii_lowercase()];
    if let Some(path) = &app.path {
        if let Some(stem) = Path::new(path).file_stem().and_then(|value| value.to_str()) {
            tokens.push(stem.to_ascii_lowercase());
        }
    }
    match app.id.as_str() {
        "vscode" => tokens.extend(["code".to_string(), "visual studio code".to_string()]),
        "cursor" => tokens.push("cursor".to_string()),
        "antigravity" => tokens.push("antigravity".to_string()),
        _ => {}
    }
    tokens
}

fn app_matches_process(app_id: &str, process_name: &str, apps: &[InstalledApp]) -> bool {
    let process_name = process_name.to_ascii_lowercase();
    let Some(app) = apps.iter().find(|app| app.id == app_id) else {
        return process_name.contains(&app_id.to_ascii_lowercase());
    };

    app_match_tokens(app)
        .into_iter()
        .map(|token| token.replace(".app", "").replace('_', " ").replace('-', " "))
        .filter(|token| !token.trim().is_empty())
        .any(|token| process_name.contains(token.trim()))
}

fn execute_workflow_nodes(workflow: &Workflow, settings: &AppSettings) -> Result<(), String> {
    for node in &workflow.nodes {
        execute_node(node, settings)?;
    }
    Ok(())
}

fn current_workflows_for_listener(app_handle: &AppHandle, settings: &AppSettings) -> Result<Vec<Workflow>, String> {
    if settings.storage_mode == "mongodb" {
        tauri::async_runtime::block_on(get_remote_workflows(settings))
    } else {
        Ok(app_handle.state::<AppState>().workflows.lock().unwrap().clone())
    }
}

fn start_in_app_listener(app: AppHandle) {
    if app
        .state::<AppState>()
        .in_app_listener_started
        .swap(true, Ordering::SeqCst)
    {
        return;
    }

    std::thread::spawn(move || {
        let mut fired = HashSet::<String>::new();

        loop {
            let state = app.state::<AppState>();
            let settings = state.settings.lock().unwrap().clone();
            let Ok(workflows) = current_workflows_for_listener(&app, &settings) else {
                std::thread::sleep(std::time::Duration::from_millis(400));
                continue;
            };
            let apps = list_installed_apps().unwrap_or_default();

            let foreground = foreground_process_name().unwrap_or_default();
            let active_ids = workflows
                .iter()
                .filter(|workflow| workflow.kind == "inApp")
                .filter(|workflow| !workflow.entry_hotkey.trim().is_empty())
                .filter(|workflow| !workflow.base_app_id.trim().is_empty())
                .filter(|workflow| app_matches_process(&workflow.base_app_id, &foreground, &apps))
                .filter(|workflow| hotkey_is_pressed(&workflow.entry_hotkey))
                .map(|workflow| workflow.id.clone())
                .collect::<HashSet<_>>();

            for workflow in workflows
                .iter()
                .filter(|workflow| active_ids.contains(&workflow.id) && !fired.contains(&workflow.id))
            {
                let _ = execute_workflow_nodes(workflow, &settings);
            }

            fired.retain(|id| active_ids.contains(id));
            fired.extend(active_ids);
            std::thread::sleep(std::time::Duration::from_millis(150));
        }
    });
}

async fn workflow_collection(settings: &AppSettings) -> Result<Collection<Workflow>, String> {
    if settings.mongodb_uri.trim().is_empty() {
        return Err("Add a MongoDB connection string in Settings before enabling cloud storage.".to_string());
    }

    let mut options = ClientOptions::parse(&settings.mongodb_uri)
        .await
        .map_err(|error| format!("MongoDB URI error: {error}"))?;
    options.app_name = Some("AdvFlow".to_string());

    let client = Client::with_options(options).map_err(|error| error.to_string())?;
    Ok(client
        .database(&settings.mongodb_database)
        .collection::<Workflow>(&settings.mongodb_collection))
}

async fn get_remote_workflows(settings: &AppSettings) -> Result<Vec<Workflow>, String> {
    let collection = workflow_collection(settings).await?;
    let mut cursor = collection
        .find(doc! {})
        .sort(doc! { "favorite": -1_i32, "updatedAt": -1_i32 })
        .await
        .map_err(|error| error.to_string())?;

    let mut workflows = Vec::new();
    while let Some(workflow) = cursor.try_next().await.map_err(|error| error.to_string())? {
        workflows.push(workflow);
    }
    Ok(sorted_workflows(workflows))
}

async fn save_remote_workflow(settings: &AppSettings, workflow: &Workflow) -> Result<(), String> {
    let collection = workflow_collection(settings).await?;
    collection
        .replace_one(doc! { "id": &workflow.id }, workflow)
        .upsert(true)
        .await
        .map_err(|error| error.to_string())?;
    Ok(())
}

async fn delete_remote_workflow(settings: &AppSettings, id: &str) -> Result<(), String> {
    let collection = workflow_collection(settings).await?;
    collection
        .delete_one(doc! { "id": id })
        .await
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<AppSettings, String> {
    Ok(state.settings.lock().unwrap().clone())
}

#[tauri::command]
pub fn save_settings(state: State<AppState>, settings: AppSettings) -> Result<AppSettings, String> {
    let mut next_settings = settings;
    validate_settings(&mut next_settings);

    {
        let mut current = state.settings.lock().unwrap();
        *current = next_settings.clone();
    }

    configure_launch_on_startup(next_settings.launch_on_startup);
    state.save_settings()?;
    Ok(next_settings)
}

#[tauri::command]
pub async fn test_mongodb_connection(state: State<'_, AppState>) -> Result<String, String> {
    let settings = state.settings.lock().unwrap().clone();
    let collection = workflow_collection(&settings).await?;
    collection
        .estimated_document_count()
        .await
        .map_err(|error| error.to_string())?;

    Ok(format!(
        "Connected to {} / {}",
        settings.mongodb_database, settings.mongodb_collection
    ))
}

#[tauri::command]
pub async fn sync_local_workflows_to_mongodb(state: State<'_, AppState>) -> Result<usize, String> {
    let settings = state.settings.lock().unwrap().clone();
    let workflows = state.workflows.lock().unwrap().clone();

    for workflow in &workflows {
        save_remote_workflow(&settings, workflow).await?;
    }

    Ok(workflows.len())
}

#[tauri::command]
pub async fn sync_mongodb_workflows_to_local(state: State<'_, AppState>) -> Result<usize, String> {
    let settings = state.settings.lock().unwrap().clone();
    let remote = get_remote_workflows(&settings).await?;

    {
        let mut workflows = state.workflows.lock().unwrap();
        *workflows = remote.clone();
    }

    state.save_local_workflows()?;
    Ok(remote.len())
}

#[tauri::command]
pub async fn export_workflow(
    state: State<'_, AppState>,
    id: String,
    path: String,
) -> Result<(), String> {
    let workflows = get_workflows(state).await?;
    let workflow = workflow_by_id_or_name(&workflows, &id)
        .ok_or_else(|| "Workflow not found".to_string())?;
    let json = serde_json::to_string_pretty(&workflow).map_err(|error| error.to_string())?;
    fs::write(path, json).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn export_all_workflows(state: State<'_, AppState>, path: String) -> Result<usize, String> {
    let workflows = get_workflows(state).await?;
    let count = workflows.len();
    let json = serde_json::to_string_pretty(&workflows).map_err(|error| error.to_string())?;
    fs::write(path, json).map_err(|error| error.to_string())?;
    Ok(count)
}

#[tauri::command]
pub async fn import_workflow(
    state: State<'_, AppState>,
    path: String,
) -> Result<Workflow, String> {
    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let value: Value = serde_json::from_str(&content).map_err(|error| error.to_string())?;
    let mut workflow: Workflow = if value.is_array() {
        let mut list: Vec<Workflow> =
            serde_json::from_value(value).map_err(|error| error.to_string())?;
        if list.len() != 1 {
            return Err(format!(
                "File contains {} workflows. Use Import library for multi-workflow files.",
                list.len()
            ));
        }
        list.remove(0)
    } else {
        serde_json::from_value(value).map_err(|error| error.to_string())?
    };

    workflow.id = Uuid::new_v4().to_string();
    workflow.created_at = timestamp();
    workflow.updated_at = timestamp();
    normalize_workflow(&mut workflow);

    let settings = state.settings.lock().unwrap().clone();
    if settings.storage_mode == "mongodb" {
        save_remote_workflow(&settings, &workflow).await?;
    } else {
        {
            let mut workflows = state.workflows.lock().unwrap();
            workflows.push(workflow.clone());
        }
        state.save_local_workflows()?;
    }

    Ok(workflow)
}

#[tauri::command]
pub async fn import_workflows(state: State<'_, AppState>, path: String) -> Result<usize, String> {
    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let value: Value = serde_json::from_str(&content).map_err(|error| error.to_string())?;
    let mut imported: Vec<Workflow> = if value.is_array() {
        serde_json::from_value(value).map_err(|error| error.to_string())?
    } else {
        vec![serde_json::from_value(value).map_err(|error| error.to_string())?]
    };
    imported.iter_mut().for_each(|workflow| {
        workflow.id = Uuid::new_v4().to_string();
        workflow.created_at = timestamp();
        workflow.updated_at = timestamp();
        normalize_workflow(workflow);
    });

    let settings = state.settings.lock().unwrap().clone();
    if settings.storage_mode == "mongodb" {
        for workflow in &imported {
            save_remote_workflow(&settings, workflow).await?;
        }
    } else {
        {
            let mut workflows = state.workflows.lock().unwrap();
            workflows.extend(imported.clone());
        }
        state.save_local_workflows()?;
    }

    Ok(imported.len())
}

#[tauri::command]
pub fn list_installed_apps() -> Result<Vec<InstalledApp>, String> {
    let mut apps = Vec::new();
    for app in known_app_candidates() {
        if app_candidate_available(&app) {
            apps.push(app);
        }
    }
    collect_start_menu_apps(&mut apps);
    collect_mac_apps(&mut apps);
    collect_linux_apps(&mut apps);
    apps.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    apps.dedup_by(|left, right| left.name.eq_ignore_ascii_case(&right.name));
    Ok(apps)
}

#[tauri::command]
pub async fn generate_workflow_from_prompt(
    state: State<'_, AppState>,
    prompt: String,
    directory: String,
    app_id: String,
) -> Result<Workflow, String> {
    if prompt.trim().is_empty() {
        return Err("Enter a prompt first.".to_string());
    }
    if directory.trim().is_empty() {
        return Err("Choose a project directory first.".to_string());
    }

    let apps = list_installed_apps()?;
    let app = app_from_id(&apps, &app_id);
    let settings = state.settings.lock().unwrap().clone();
    let workflow = generate_workflow_with_gemini(&settings, &prompt, &directory, &app).await?;

    if settings.storage_mode == "mongodb" {
        save_remote_workflow(&settings, &workflow).await?;
    } else {
        {
            let mut workflows = state.workflows.lock().unwrap();
            workflows.push(workflow.clone());
        }
        state.save_local_workflows()?;
    }

    Ok(workflow)
}

#[tauri::command]
pub async fn generate_workflow_from_folder(
    state: State<'_, AppState>,
    directory: String,
    prompt: Option<String>,
) -> Result<Workflow, String> {
    let directory = directory.trim().to_string();
    if directory.is_empty() {
        return Err("Choose a project directory first.".to_string());
    }
    let root = Path::new(&directory);
    if !root.exists() || !root.is_dir() {
        return Err(format!("Directory does not exist: {directory}"));
    }

    let packages = scan_project(root);
    if packages.is_empty() {
        return Err("No package.json found in this folder.".to_string());
    }

    let settings = state.settings.lock().unwrap().clone();
    let apps = list_installed_apps()?;
    let app = app_from_id(&apps, &settings.preferred_editor);
    let user_prompt = prompt.unwrap_or_default();

    let workflow =
        generate_workflow_from_scan(&settings, &user_prompt, &directory, &app, &packages).await?;

    if settings.storage_mode == "mongodb" {
        save_remote_workflow(&settings, &workflow).await?;
    } else {
        {
            let mut workflows = state.workflows.lock().unwrap();
            workflows.push(workflow.clone());
        }
        state.save_local_workflows()?;
    }

    Ok(workflow)
}

#[tauri::command]
pub async fn suggest_node_update(
    state: State<'_, AppState>,
    prompt: String,
    node: Value,
    directory: String,
) -> Result<Value, String> {
    let settings = state.settings.lock().unwrap().clone();
    update_node_with_ai(&settings, &prompt, &node, &directory).await
}

#[tauri::command]
pub async fn get_workflows(state: State<'_, AppState>) -> Result<Vec<Workflow>, String> {
    let settings = state.settings.lock().unwrap().clone();
    if settings.storage_mode == "mongodb" {
        return get_remote_workflows(&settings).await;
    }

    let workflows = state.workflows.lock().unwrap().clone();
    Ok(sorted_workflows(workflows))
}

#[tauri::command]
pub async fn create_workflow(state: State<'_, AppState>, payload: Value) -> Result<Workflow, String> {
    let now = timestamp();
    let mut workflow = Workflow {
        id: Uuid::new_v4().to_string(),
        name: payload
            .get("name")
            .and_then(|value| value.as_str())
            .unwrap_or("New Workflow")
            .to_string(),
        description: payload
            .get("description")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string(),
        favorite: payload
            .get("favorite")
            .and_then(|value| value.as_bool())
            .unwrap_or(false),
        kind: payload
            .get("kind")
            .and_then(|value| value.as_str())
            .unwrap_or("desktop")
            .to_string(),
        base_app_id: payload
            .get("baseAppId")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string(),
        entry_hotkey: payload
            .get("entryHotkey")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string(),
        nodes: payload
            .get("nodes")
            .and_then(|value| value.as_array())
            .cloned()
            .unwrap_or_default(),
        edges: payload
            .get("edges")
            .and_then(|value| value.as_array())
            .cloned()
            .unwrap_or_default(),
        tags: payload
            .get("tags")
            .and_then(|value| value.as_array())
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.as_str().map(|value| value.to_string()))
                    .collect()
            })
            .unwrap_or_default(),
        created_at: now.clone(),
        updated_at: now,
    };
    normalize_workflow(&mut workflow);

    let settings = state.settings.lock().unwrap().clone();
    if settings.storage_mode == "mongodb" {
        save_remote_workflow(&settings, &workflow).await?;
        return Ok(workflow);
    }

    {
        let mut workflows = state.workflows.lock().unwrap();
        workflows.push(workflow.clone());
    }
    state.save_local_workflows()?;

    Ok(workflow)
}

#[tauri::command]
pub async fn toggle_favorite(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let settings = state.settings.lock().unwrap().clone();

    if settings.storage_mode == "mongodb" {
        let collection = workflow_collection(&settings).await?;
        let maybe_workflow = collection
            .find_one(doc! { "id": &id })
            .await
            .map_err(|error| error.to_string())?;

        if let Some(mut workflow) = maybe_workflow {
            workflow.favorite = !workflow.favorite;
            workflow.updated_at = timestamp();
            save_remote_workflow(&settings, &workflow).await?;
        }
        return Ok(());
    }

    {
        let mut workflows = state.workflows.lock().unwrap();
        if let Some(workflow) = workflows.iter_mut().find(|workflow| workflow.id == id) {
            workflow.favorite = !workflow.favorite;
            workflow.updated_at = timestamp();
        }
    }
    state.save_local_workflows()?;
    Ok(())
}

#[tauri::command]
pub async fn duplicate_workflow(state: State<'_, AppState>, id: String) -> Result<Workflow, String> {
    let settings = state.settings.lock().unwrap().clone();

    let original = if settings.storage_mode == "mongodb" {
        let collection = workflow_collection(&settings).await?;
        collection
            .find_one(doc! { "id": &id })
            .await
            .map_err(|error| error.to_string())?
    } else {
        let workflows = state.workflows.lock().unwrap();
        workflows.iter().find(|workflow| workflow.id == id).cloned()
    };

    if let Some(mut workflow) = original {
        let now = timestamp();
        workflow.id = Uuid::new_v4().to_string();
        workflow.name = format!("{} Copy", workflow.name);
        workflow.favorite = false;
        workflow.created_at = now.clone();
        workflow.updated_at = now;

        if settings.storage_mode == "mongodb" {
            save_remote_workflow(&settings, &workflow).await?;
        } else {
            {
                let mut workflows = state.workflows.lock().unwrap();
                workflows.push(workflow.clone());
            }
            state.save_local_workflows()?;
        }
        return Ok(workflow);
    }

    Err("Workflow not found".to_string())
}

#[tauri::command]
pub async fn delete_workflow(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let settings = state.settings.lock().unwrap().clone();

    if settings.storage_mode == "mongodb" {
        delete_remote_workflow(&settings, &id).await?;
        return Ok(());
    }

    {
        let mut workflows = state.workflows.lock().unwrap();
        workflows.retain(|workflow| workflow.id != id);
    }
    state.save_local_workflows()?;
    Ok(())
}

#[tauri::command]
pub async fn get_workflow(state: State<'_, AppState>, id: String) -> Result<Workflow, String> {
    let settings = state.settings.lock().unwrap().clone();
    if settings.storage_mode == "mongodb" {
        let collection = workflow_collection(&settings).await?;
        let mut workflow = collection
            .find_one(doc! { "id": &id })
            .await
            .map_err(|error| error.to_string())?
            .ok_or_else(|| "Workflow not found".to_string())?;
        normalize_workflow(&mut workflow);
        return Ok(workflow);
    }

    let workflows = state.workflows.lock().unwrap();
    let mut workflow = workflows
        .iter()
        .find(|workflow| workflow.id == id)
        .cloned()
        .ok_or_else(|| "Workflow not found".to_string())?;
    normalize_workflow(&mut workflow);
    Ok(workflow)
}

#[tauri::command]
pub async fn update_workflow(
    state: State<'_, AppState>,
    id: String,
    payload: Value,
) -> Result<Workflow, String> {
    let settings = state.settings.lock().unwrap().clone();

    if settings.storage_mode == "mongodb" {
        let collection = workflow_collection(&settings).await?;
        let maybe_workflow = collection
            .find_one(doc! { "id": &id })
            .await
            .map_err(|error| error.to_string())?;

        if let Some(mut workflow) = maybe_workflow {
            apply_workflow_payload(&mut workflow, &payload);
            workflow.updated_at = timestamp();
            normalize_workflow(&mut workflow);
            save_remote_workflow(&settings, &workflow).await?;
            return Ok(workflow);
        }
        return Err("Workflow not found".to_string());
    }

    let updated = {
        let mut workflows = state.workflows.lock().unwrap();
        if let Some(workflow) = workflows.iter_mut().find(|workflow| workflow.id == id) {
            apply_workflow_payload(workflow, &payload);
            workflow.updated_at = timestamp();
            normalize_workflow(workflow);
            Some(workflow.clone())
        } else {
            None
        }
    };

    match updated {
        Some(workflow) => {
            state.save_local_workflows()?;
            Ok(workflow)
        }
        None => Err("Workflow not found".to_string()),
    }
}

fn apply_workflow_payload(workflow: &mut Workflow, payload: &Value) {
    if let Some(name) = payload.get("name").and_then(|value| value.as_str()) {
        workflow.name = name.to_string();
    }
    if let Some(description) = payload.get("description").and_then(|value| value.as_str()) {
        workflow.description = description.to_string();
    }
    if let Some(favorite) = payload.get("favorite").and_then(|value| value.as_bool()) {
        workflow.favorite = favorite;
    }
    if let Some(kind) = payload.get("kind").and_then(|value| value.as_str()) {
        workflow.kind = kind.to_string();
    }
    if let Some(base_app_id) = payload.get("baseAppId").and_then(|value| value.as_str()) {
        workflow.base_app_id = base_app_id.to_string();
    }
    if let Some(entry_hotkey) = payload.get("entryHotkey").and_then(|value| value.as_str()) {
        workflow.entry_hotkey = entry_hotkey.to_string();
    }
    if let Some(nodes) = payload.get("nodes").and_then(|value| value.as_array()) {
        workflow.nodes = nodes.clone();
    }
    if let Some(edges) = payload.get("edges").and_then(|value| value.as_array()) {
        workflow.edges = edges.clone();
    }
    if let Some(tags) = payload.get("tags").and_then(|value| value.as_array()) {
        workflow.tags = tags
            .iter()
            .filter_map(|item| item.as_str().map(|value| value.to_string()))
            .collect();
    }
}

#[tauri::command]
pub fn test_node(payload: Value) -> Result<(), String> {
    let settings = AppSettings::default();
    execute_node(&json!({ "data": payload }), &settings).map(|_| ())
}

#[tauri::command]
pub async fn list_local_models(
    state: State<'_, AppState>,
    endpoint: Option<String>,
    api_key: Option<String>,
) -> Result<Vec<String>, String> {
    let settings = state.settings.lock().unwrap().clone();
    let endpoint = endpoint
        .unwrap_or_else(|| settings.local_model_endpoint.clone())
        .trim()
        .trim_end_matches('/')
        .to_string();
    if endpoint.is_empty() {
        return Err("Add a local model endpoint first.".to_string());
    }

    let mut request = reqwest::Client::new().get(format!("{endpoint}/models"));
    let token = api_key.unwrap_or_else(|| settings.local_model_api_key.clone());
    if !token.trim().is_empty() {
        request = request.bearer_auth(token.trim());
    }

    let response: Value = request
        .send()
        .await
        .map_err(|error| format!("Could not reach local model host: {error}"))?
        .json()
        .await
        .map_err(|error| format!("Local model host did not return JSON: {error}"))?;

    let mut models = response
        .get("data")
        .and_then(|value| value.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.get("id").and_then(|value| value.as_str()))
                .map(|value| value.to_string())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    models.sort();
    models.dedup();
    Ok(models)
}

#[tauri::command]
pub fn ensure_in_app_listener(app: AppHandle) -> Result<bool, String> {
    start_in_app_listener(app.clone());
    Ok(app
        .state::<AppState>()
        .in_app_listener_started
        .load(Ordering::SeqCst))
}

#[tauri::command]
pub async fn execute_workflow(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let settings = state.settings.lock().unwrap().clone();
    let workflow = if settings.storage_mode == "mongodb" {
        let workflows = get_remote_workflows(&settings).await?;
        workflow_by_id_or_name(&workflows, &id)
    } else {
        let workflows = state.workflows.lock().unwrap();
        workflow_by_id_or_name(&workflows, &id)
    }
    .ok_or_else(|| "Workflow not found".to_string())?;

    execute_workflow_nodes(&workflow, &settings)
}

pub fn init_state(app_handle: &AppHandle) -> AppState {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));

    if !app_dir.exists() {
        let _ = fs::create_dir_all(&app_dir);
    }

    let workflows_path = app_dir.join("workflows.json");
    let settings_path = app_dir.join("settings.json");

    let mut settings: AppSettings = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path).unwrap_or_else(|_| "{}".to_string());
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        AppSettings::default()
    };
    validate_settings(&mut settings);

    let mut workflows: Vec<Workflow> = if workflows_path.exists() {
        let content = fs::read_to_string(&workflows_path).unwrap_or_else(|_| "[]".to_string());
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    workflows.iter_mut().for_each(normalize_workflow);

    AppState {
        workflows_path,
        settings_path,
        workflows: Mutex::new(workflows),
        settings: Mutex::new(settings),
        in_app_listener_started: AtomicBool::new(false),
    }
}
