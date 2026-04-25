use chrono::Utc;
use futures_util::TryStreamExt;
use mongodb::{
    bson::doc,
    options::ClientOptions,
    Client, Collection,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct Workflow {
    pub id: String,
    pub name: String,
    pub description: String,
    pub favorite: bool,
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
    pub gemini_api_key: String,
    pub gemini_model: String,
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
            gemini_api_key: String::new(),
            gemini_model: "gemini-2.5-flash".to_string(),
        }
    }
}

pub struct AppState {
    pub workflows_path: PathBuf,
    pub settings_path: PathBuf,
    pub workflows: Mutex<Vec<Workflow>>,
    pub settings: Mutex<AppSettings>,
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
    if settings.preferred_browser.trim().is_empty() {
        settings.preferred_browser = "chrome".to_string();
    }
    if settings.preferred_editor.trim().is_empty() {
        settings.preferred_editor = "vscode".to_string();
    }
    if settings.gemini_model.trim().is_empty() {
        settings.gemini_model = "gemini-2.5-flash".to_string();
    }
}

fn configure_launch_on_startup(enabled: bool) {
    let Ok(exe) = std::env::current_exe() else {
        return;
    };
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
    vec![
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
    ]
}

fn command_exists(command: &str) -> bool {
    Command::new("where")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn collect_start_menu_apps(apps: &mut Vec<InstalledApp>) {
    let mut roots = Vec::new();
    if let Ok(program_data) = std::env::var("ProgramData") {
        roots.push(PathBuf::from(program_data).join("Microsoft\\Windows\\Start Menu\\Programs"));
    }
    if let Ok(app_data) = std::env::var("AppData") {
        roots.push(PathBuf::from(app_data).join("Microsoft\\Windows\\Start Menu\\Programs"));
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

        if apps.len() > 160 {
            return;
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
        .filter(|value| matches!(*value, "openApp" | "runCommand" | "openBrowser" | "delay"))
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
        workflow.tags = vec!["ai".to_string(), "gemini".to_string()];
    }
    normalize_workflow(&mut workflow);
    workflow
}

fn workflow_generation_prompt(prompt: &str, directory: &str, app: &InstalledApp) -> String {
    format!(
        r#"Create one Advflow workflow as strict JSON only. No markdown.

Use this TypeScript shape:
{{
  "name": "string",
  "description": "string",
  "favorite": false,
  "tags": ["ai", "gemini"],
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

async fn generate_workflow_with_gemini(
    settings: &AppSettings,
    prompt: &str,
    directory: &str,
    app: &InstalledApp,
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
            "parts": [{
                "text": workflow_generation_prompt(prompt, directory, app)
            }]
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

    let client = reqwest::Client::new();
    let response: Value = client
        .post(url)
        .header("x-goog-api-key", api_key)
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("Gemini request failed: {error}"))?
        .json()
        .await
        .map_err(|error| format!("Gemini response was not JSON: {error}"))?;

    let text = response
        .pointer("/candidates/0/content/parts/0/text")
        .and_then(|value| value.as_str())
        .ok_or_else(|| format!("Gemini did not return workflow JSON: {response}"))?;
    let workflow: Workflow = serde_json::from_str(text)
        .map_err(|error| format!("Gemini returned invalid workflow JSON: {error}"))?;

    Ok(normalize_generated_workflow(workflow, prompt, directory))
}

async fn update_node_with_gemini(
    settings: &AppSettings,
    prompt: &str,
    node: &Value,
    directory: &str,
) -> Result<Value, String> {
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
    let instruction = format!(
        "Edit this Advflow ReactFlow node according to the prompt. Return the full node JSON only. Keep node.id, node.type, and position unless the prompt explicitly requires otherwise. Directory to use when relevant: {directory}\nPrompt: {prompt}\nNode JSON: {node}",
        node = serde_json::to_string_pretty(node).unwrap_or_else(|_| "{}".to_string())
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

    let text = response
        .pointer("/candidates/0/content/parts/0/text")
        .and_then(|value| value.as_str())
        .ok_or_else(|| format!("Gemini did not return node JSON: {response}"))?;
    serde_json::from_str(text).map_err(|error| format!("Gemini returned invalid node JSON: {error}"))
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
    let working_directory_text = working_directory.to_string_lossy().to_string();
    let shell = data
        .get("shellType")
        .and_then(|value| value.as_str())
        .unwrap_or("powershell");
    let terminal_type = data
        .get("terminalType")
        .and_then(|value| value.as_str())
        .unwrap_or("background");

    if terminal_type == "newWindow" {
        if shell == "cmd" {
            let cmd_line = format!(
                "cd /d \"{}\" && {}",
                working_directory_text.replace('"', "\"\""),
                command
            );

            Command::new("cmd")
                .args([
                    "/c",
                    "start",
                    "Command Window",
                    "cmd",
                    "/k",
                    &cmd_line,
                ])
                .spawn()
                .map_err(|error| error.to_string())?;
        } else {
            let ps_script = format!(
                "Set-Location -LiteralPath {}; {}",
                ps_quote(&working_directory_text),
                command
            );

            Command::new("cmd")
                .args([
                    "/c",
                    "start",
                    "PowerShell Window",
                    "powershell",
                    "-NoExit",
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-Command",
                    &ps_script,
                ])
                .spawn()
                .map_err(|error| error.to_string())?;
        }

        return Ok("Opened command in a new terminal window.".to_string());
    }

    let mut process = if shell == "cmd" {
        let mut command_process = Command::new("cmd");
        command_process.args(["/c", command]);
        command_process
    } else {
        let mut command_process = Command::new("powershell");
        command_process.args(["-NoProfile", "-Command", command]);
        command_process
    };
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
                .filter_map(|item| item.as_str().map(|arg| arg.replace("{path}", folder_path)))
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
    Ok("Application launch requested.".to_string())
}

fn open_browser_node(data: &Value) -> Result<String, String> {
    let url = data.get("url").and_then(|value| value.as_str()).unwrap_or("");
    if url.trim().is_empty() {
        return Err("URL is empty".to_string());
    }
    let browser = data.get("browser").and_then(|value| value.as_str()).unwrap_or("chrome");
    let command = match browser {
        "edge" => "msedge",
        "brave" => "brave",
        "comet" => "comet",
        _ => "chrome",
    };

    Command::new("cmd")
        .args(["/c", "start", "", command, url])
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(format!("Opened {url}"))
}

fn execute_node(node: &Value, settings: &AppSettings) -> Result<String, String> {
    let data = node.get("data").unwrap_or(node);
    match data.get("type").and_then(|value| value.as_str()).unwrap_or("") {
        "openApp" => open_app_node(data),
        "runCommand" => run_command_node(data, settings.command_timeout_seconds),
        "openBrowser" => open_browser_node(data),
        "delay" => {
            let delay = data.get("delay").and_then(|value| value.as_u64()).unwrap_or(1000);
            std::thread::sleep(std::time::Duration::from_millis(delay.min(60_000)));
            Ok(format!("Waited {delay}ms"))
        }
        node_type => Err(format!("Unsupported node type: {node_type}")),
    }
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
        if app.source != "path" || command_exists(&app.command) {
            apps.push(app);
        }
    }
    collect_start_menu_apps(&mut apps);
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
pub async fn suggest_node_update(
    state: State<'_, AppState>,
    prompt: String,
    node: Value,
    directory: String,
) -> Result<Value, String> {
    let settings = state.settings.lock().unwrap().clone();
    update_node_with_gemini(&settings, &prompt, &node, &directory).await
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

    for node in &workflow.nodes {
        execute_node(node, &settings)?;
    }

    Ok(())
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
    }
}
