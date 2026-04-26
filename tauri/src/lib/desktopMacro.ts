import { invoke } from "@tauri-apps/api/core";
import type { MacroAction, MacroMouseButton } from "@/types/macro";

export function isRunningAsAdmin() {
  return invoke<boolean>("is_running_as_admin");
}

export function restartAsAdmin() {
  return invoke<string>("restart_as_admin");
}

export function moveMouse(x: number, y: number) {
  return invoke<void>("move_mouse", { x, y });
}

export function mouseClick(button: MacroMouseButton) {
  return invoke<void>("mouse_click", { button });
}

export function mouseDoubleClick(button: MacroMouseButton) {
  return invoke<void>("mouse_double_click", { button });
}

export function mouseScroll(amount: number) {
  return invoke<void>("mouse_scroll", { amount });
}

export function typeText(text: string) {
  return invoke<void>("type_text", { text });
}

export function pressKey(key: string) {
  return invoke<void>("press_key", { key });
}

export function hotkey(keys: string[]) {
  return invoke<void>("hotkey", { keys });
}

export function waitMs(ms: number) {
  return invoke<void>("wait_ms", { ms });
}

export function openApp(path: string, args?: string[] | null) {
  return invoke<string>("open_app", { path, args });
}

export function runCommand(
  command: string,
  workingDirectory?: string | null,
  admin?: boolean | null,
) {
  return invoke<string>("run_command", {
    command,
    workingDirectory,
    admin,
  });
}

export function replayMacro(actions: MacroAction[]) {
  return invoke<string>("replay_macro", { actions });
}
