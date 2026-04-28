import type { KeyboardEvent as ReactKeyboardEvent } from "react";

function keyNameFromCode(code: string, fallback: string) {
  if (code.startsWith("Key")) return code.slice(3).toUpperCase();
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) {
    const value = code.slice(6);
    if (/^\d$/.test(value)) return value;
    if (value === "Add") return "+";
    if (value === "Subtract") return "-";
    if (value === "Multiply") return "*";
    if (value === "Divide") return "/";
    if (value === "Decimal") return ".";
  }

  const namedCodes: Record<string, string> = {
    Backquote: "`",
    Minus: "Minus",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Space: "Space",
    Enter: "Enter",
    Tab: "Tab",
    Escape: "Escape",
    Backspace: "Backspace",
    Delete: "Delete",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    ArrowUp: "Up",
    ArrowDown: "Down",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
  };

  if (code in namedCodes) return namedCodes[code];
  if (/^F\d{1,2}$/.test(code)) return code;
  if (fallback === " ") return "Space";
  return fallback.length === 1 ? fallback.toUpperCase() : fallback;
}

export function keyEventToCombo(event: KeyboardEvent | ReactKeyboardEvent) {
  const key = event.key;
  const parts: string[] = [];
  const isModifier = ["Control", "Meta", "Alt", "Shift"].includes(key);

  if (event.ctrlKey) parts.push("Ctrl");
  if (event.metaKey) parts.push("Meta");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");

  if (isModifier) return "";

  if (!isModifier) {
    parts.push(keyNameFromCode(event.code, key));
  }

  return parts.join("+");
}
