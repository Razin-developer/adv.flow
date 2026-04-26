use enigo::{
    Axis, Button, Coordinate, Direction, Enigo, Key, Keyboard, Mouse, Settings,
};
use serde::{Deserialize, Serialize};
use std::{
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::Duration,
};
use tauri::AppHandle;
#[cfg(windows)]
use windows::{
    core::PCWSTR,
    Win32::{
        Foundation::HWND,
        UI::{
            Shell::{IsUserAnAdmin, ShellExecuteW},
            WindowsAndMessaging::SW_SHOWNORMAL,
        },
    },
};


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum MacroAction {
    MoveMouse { x: i32, y: i32 },
    MouseClick { button: String },
    MouseDoubleClick { button: String },
    MouseScroll { amount: i32 },
    TypeText { text: String },
    PressKey { key: String },
    Hotkey { keys: Vec<String> },
    WaitMs { ms: u64 },
    OpenApp {
        path: String,
        args: Option<Vec<String>>,
    },
    RunCommand {
        command: String,
        working_directory: Option<String>,
        admin: Option<bool>,
    },
}

fn create_enigo() -> Result<Enigo, String> {
    Enigo::new(&Settings::default()).map_err(|error| error.to_string())
}

fn parse_button(button: &str) -> Result<Button, String> {
    match button.trim().to_ascii_lowercase().as_str() {
        "left" => Ok(Button::Left),
        "right" => Ok(Button::Right),
        "middle" | "center" => Ok(Button::Middle),
        other => Err(format!("Unsupported mouse button: {other}")),
    }
}

fn parse_key(key: &str) -> Result<Key, String> {
    let normalized = key.trim().to_ascii_lowercase();
    let parsed = match normalized.as_str() {
        "alt" => Key::Alt,
        "backspace" => Key::Backspace,
        "capslock" | "caps_lock" => Key::CapsLock,
        "ctrl" | "control" => Key::Control,
        "delete" | "del" => Key::Delete,
        "down" | "downarrow" | "arrowdown" => Key::DownArrow,
        "end" => Key::End,
        "enter" | "return" => Key::Return,
        "esc" | "escape" => Key::Escape,
        "home" => Key::Home,
        "insert" | "ins" => Key::Insert,
        "left" | "leftarrow" | "arrowleft" => Key::LeftArrow,
        "meta" | "super" | "win" | "windows" | "cmd" | "command" => Key::Meta,
        "pagedown" | "page_down" => Key::PageDown,
        "pageup" | "page_up" => Key::PageUp,
        "shift" => Key::Shift,
        "space" => Key::Space,
        "tab" => Key::Tab,
        "up" | "uparrow" | "arrowup" => Key::UpArrow,
        "right" | "rightarrow" | "arrowright" => Key::RightArrow,
        "f1" => Key::F1,
        "f2" => Key::F2,
        "f3" => Key::F3,
        "f4" => Key::F4,
        "f5" => Key::F5,
        "f6" => Key::F6,
        "f7" => Key::F7,
        "f8" => Key::F8,
        "f9" => Key::F9,
        "f10" => Key::F10,
        "f11" => Key::F11,
        "f12" => Key::F12,
        _ => {
            let mut chars = key.chars();
            match (chars.next(), chars.next()) {
                (Some(ch), None) => Key::Unicode(ch),
                _ => return Err(format!("Unsupported key: {key}")),
            }
        }
    };

    Ok(parsed)
}

fn to_wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

fn optional_working_directory(path: Option<String>) -> Result<Option<PathBuf>, String> {
    match path {
        Some(value) if !value.trim().is_empty() => {
            let candidate = PathBuf::from(value.trim());
            if !candidate.exists() {
                return Err(format!(
                    "Working directory does not exist: {}",
                    candidate.display()
                ));
            }
            Ok(Some(candidate))
        }
        _ => Ok(None),
    }
}

#[cfg(windows)]
fn shell_execute_open(path: &str, args: &[String], verb: &str) -> Result<(), String> {
    let file = to_wide(path);
    let parameters_string = if args.is_empty() {
        None
    } else {
        Some(args.join(" "))
    };
    let parameters = parameters_string.as_ref().map(|value| to_wide(value));
    let verb_wide = to_wide(verb);

    let result = unsafe {
        ShellExecuteW(
            Some(HWND::default()),
            PCWSTR(verb_wide.as_ptr()),
            PCWSTR(file.as_ptr()),
            parameters
                .as_ref()
                .map(|value| PCWSTR(value.as_ptr()))
                .unwrap_or(PCWSTR::null()),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };

    let code = result.0 as isize;
    if code <= 32 {
        return Err(format!("ShellExecuteW failed with code {code}"));
    }

    Ok(())
}

#[cfg(not(windows))]
fn shell_execute_open(_path: &str, _args: &[String], _verb: &str) -> Result<(), String> {
    Err("ShellExecute is only supported on Windows.".into())
}


fn run_shell_command(
    command: &str,
    working_directory: Option<String>,
    admin: bool,
) -> Result<String, String> {
    let working_directory = optional_working_directory(working_directory)?;

    if admin {
        #[cfg(windows)]
        {
            let mut segments = Vec::new();
            if let Some(dir) = &working_directory {
                segments.push(format!("cd /d \"{}\"", dir.display()));
            }
            segments.push(command.to_string());
            shell_execute_open("cmd.exe", &["/C".into(), segments.join(" && ")], "runas")?;
            return Ok("Started elevated command.".into());
        }
        #[cfg(not(windows))]
        {
            return Err("Elevated commands are currently only supported on Windows.".into());
        }
    }

    let shell = if cfg!(windows) { "cmd" } else { "sh" };
    let arg = if cfg!(windows) { "/C" } else { "-c" };

    let mut process = Command::new(shell);
    process.arg(arg).arg(command);

    if let Some(dir) = &working_directory {
        process.current_dir(dir);
    }

    let output = process.output().map_err(|error| error.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if output.status.success() {
        if stdout.is_empty() {
            Ok("Command completed successfully.".into())
        } else {
            Ok(stdout)
        }
    } else if stderr.is_empty() {
        Err(format!("Command failed with status {}", output.status))
    } else {
        Err(stderr)
    }
}


fn execute_action(action: MacroAction) -> Result<(), String> {
    match action {
        MacroAction::MoveMouse { x, y } => move_mouse(x, y),
        MacroAction::MouseClick { button } => mouse_click(button),
        MacroAction::MouseDoubleClick { button } => mouse_double_click(button),
        MacroAction::MouseScroll { amount } => mouse_scroll(amount),
        MacroAction::TypeText { text } => type_text(text),
        MacroAction::PressKey { key } => press_key(key),
        MacroAction::Hotkey { keys } => hotkey(keys),
        MacroAction::WaitMs { ms } => wait_ms(ms),
        MacroAction::OpenApp { path, args } => open_app(path, args).map(|_| ()),
        MacroAction::RunCommand {
            command,
            working_directory,
            admin,
        } => run_command(command, working_directory, admin).map(|_| ()),
    }
}

#[tauri::command]
pub fn is_running_as_admin() -> Result<bool, String> {
    #[cfg(windows)]
    {
        Ok(unsafe { IsUserAnAdmin().as_bool() })
    }
    #[cfg(not(windows))]
    {
        // On Unix, we could check UID, but for now let's just return false
        Ok(false)
    }
}


#[tauri::command]
pub fn restart_as_admin(app: AppHandle) -> Result<String, String> {
    #[cfg(windows)]
    {
        let exe_path = std::env::current_exe().map_err(|error| error.to_string())?;
        let exe = exe_path
            .to_str()
            .ok_or_else(|| "Executable path contains invalid UTF-16 data.".to_string())?;

        shell_execute_open(exe, &[], "runas")?;
        app.exit(0);
        Ok("Restarting as Administrator.".into())
    }
    #[cfg(not(windows))]
    {
        let _ = app; // silence unused warning
        Err("Restarting as admin is only supported on Windows.".into())
    }
}


#[tauri::command]
pub fn move_mouse(x: i32, y: i32) -> Result<(), String> {
    let mut enigo = create_enigo()?;
    enigo
        .move_mouse(x, y, Coordinate::Abs)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn mouse_click(button: String) -> Result<(), String> {
    let mut enigo = create_enigo()?;
    let button = parse_button(&button)?;
    enigo
        .button(button, Direction::Click)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn mouse_double_click(button: String) -> Result<(), String> {
    let mut enigo = create_enigo()?;
    let button = parse_button(&button)?;
    enigo
        .button(button, Direction::Click)
        .map_err(|error| error.to_string())?;
    thread::sleep(Duration::from_millis(75));
    enigo
        .button(button, Direction::Click)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn mouse_scroll(amount: i32) -> Result<(), String> {
    let mut enigo = create_enigo()?;
    enigo
        .scroll(amount, Axis::Vertical)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn type_text(text: String) -> Result<(), String> {
    let mut enigo = create_enigo()?;
    enigo.text(&text).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn press_key(key: String) -> Result<(), String> {
    let mut enigo = create_enigo()?;
    let parsed = parse_key(&key)?;
    enigo
        .key(parsed, Direction::Click)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn hotkey(keys: Vec<String>) -> Result<(), String> {
    if keys.is_empty() {
        return Err("Hotkey requires at least one key.".into());
    }

    let parsed_keys = keys
        .iter()
        .map(|key| parse_key(key))
        .collect::<Result<Vec<_>, _>>()?;

    let mut enigo = create_enigo()?;
    for key in parsed_keys.iter().take(parsed_keys.len().saturating_sub(1)) {
        enigo
            .key(*key, Direction::Press)
            .map_err(|error| error.to_string())?;
    }

    if let Some(last) = parsed_keys.last() {
        enigo
            .key(*last, Direction::Click)
            .map_err(|error| error.to_string())?;
    }

    for key in parsed_keys
        .iter()
        .take(parsed_keys.len().saturating_sub(1))
        .rev()
    {
        enigo
            .key(*key, Direction::Release)
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn wait_ms(ms: u64) -> Result<(), String> {
    thread::sleep(Duration::from_millis(ms));
    Ok(())
}

#[tauri::command]
pub fn open_app(path: String, args: Option<Vec<String>>) -> Result<String, String> {
    let args = args.unwrap_or_default();
    let executable = Path::new(&path);
    if !executable.exists() {
        return Err(format!("App path does not exist: {}", executable.display()));
    }

    Command::new(executable)
        .args(&args)
        .spawn()
        .map_err(|error| error.to_string())?;

    Ok(format!("Opened {}.", executable.display()))
}

#[tauri::command]
pub fn run_command(
    command: String,
    working_directory: Option<String>,
    admin: Option<bool>,
) -> Result<String, String> {
    run_shell_command(&command, working_directory, admin.unwrap_or(false))
}

#[tauri::command]
pub fn replay_macro(actions: Vec<MacroAction>) -> Result<String, String> {
    let total = actions.len();
    for action in actions {
        execute_action(action)?;
    }

    Ok(format!("Replayed {total} macro actions."))
}
