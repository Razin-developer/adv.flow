export type MacroMouseButton = "left" | "right" | "middle";

export type MacroAction =
  | { type: "moveMouse"; x: number; y: number }
  | { type: "mouseClick"; button: MacroMouseButton }
  | { type: "mouseDoubleClick"; button: MacroMouseButton }
  | { type: "mouseScroll"; amount: number }
  | { type: "typeText"; text: string }
  | { type: "pressKey"; key: string }
  | { type: "hotkey"; keys: string[] }
  | { type: "waitMs"; ms: number }
  | { type: "openApp"; path: string; args?: string[] | null }
  | {
      type: "runCommand";
      command: string;
      workingDirectory?: string | null;
      admin?: boolean | null;
    };
