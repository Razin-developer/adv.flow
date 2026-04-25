import {
  AlertTriangle,
  CheckCircle2,
  Info,
  MessageSquareText,
  X,
  XCircle,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DialogKind = "info" | "success" | "error" | "confirm" | "prompt";

type DialogOptions = {
  kind?: DialogKind;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
  defaultValue?: string;
};

type DialogRequest = Required<Pick<DialogOptions, "title">> &
  Omit<DialogOptions, "title"> & {
    id: number;
    resolve: (value: boolean | string | null) => void;
  };

interface DialogApi {
  alert: (options: DialogOptions) => Promise<void>;
  confirm: (options: DialogOptions) => Promise<boolean>;
  prompt: (options: DialogOptions) => Promise<string | null>;
  success: (title: string, message?: string) => Promise<void>;
  error: (title: string, message?: string) => Promise<void>;
  info: (title: string, message?: string) => Promise<void>;
}

const DialogContext = createContext<DialogApi | null>(null);

const ICONS: Record<DialogKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
  confirm: AlertTriangle,
  prompt: MessageSquareText,
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [promptValue, setPromptValue] = useState("");

  const openDialog = useCallback((options: DialogOptions) => {
    return new Promise<boolean | string | null>((resolve) => {
      setPromptValue(options.defaultValue || "");
      setDialog({
        id: Date.now(),
        kind: options.kind || "info",
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        placeholder: options.placeholder,
        defaultValue: options.defaultValue,
        resolve,
      });
    });
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      alert: async (options) => {
        await openDialog(options);
      },
      confirm: async (options) =>
        (await openDialog({ ...options, kind: "confirm" })) === true,
      prompt: async (options) => {
        const value = await openDialog({ ...options, kind: "prompt" });
        return typeof value === "string" ? value : null;
      },
      success: async (title, message) => {
        await openDialog({ kind: "success", title, message });
      },
      error: async (title, message) => {
        await openDialog({ kind: "error", title, message });
      },
      info: async (title, message) => {
        await openDialog({ kind: "info", title, message });
      },
    }),
    [openDialog],
  );

  const close = (value: boolean | string | null) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  const Icon = dialog ? ICONS[dialog.kind || "info"] : Info;
  const isChoice = dialog?.kind === "confirm" || dialog?.kind === "prompt";

  return (
    <DialogContext.Provider value={api}>
      {children}
      {dialog ? (
        <div className="dialog-backdrop" role="presentation">
          <section
            className={`app-dialog dialog-${dialog.kind || "info"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`dialog-title-${dialog.id}`}
          >
            <button className="dialog-close" type="button" onClick={() => close(null)}>
              <X size={16} />
            </button>
            <div className="dialog-icon">
              <Icon size={20} />
            </div>
            <div className="dialog-copy">
              <h2 id={`dialog-title-${dialog.id}`}>{dialog.title}</h2>
              {dialog.message ? <p>{dialog.message}</p> : null}
            </div>
            {dialog.kind === "prompt" ? (
              <input
                className="dialog-input"
                value={promptValue}
                placeholder={dialog.placeholder}
                autoFocus
                onChange={(event) => setPromptValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") close(promptValue);
                }}
              />
            ) : null}
            <div className="dialog-actions">
              {isChoice ? (
                <button className="secondary-action" type="button" onClick={() => close(null)}>
                  {dialog.cancelLabel || "Cancel"}
                </button>
              ) : null}
              <button
                className={dialog.kind === "error" ? "danger-button" : "primary-button"}
                type="button"
                onClick={() => close(dialog.kind === "prompt" ? promptValue : true)}
              >
                {dialog.confirmLabel || (isChoice ? "Continue" : "Done")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </DialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useAppDialog must be used inside DialogProvider");
  }
  return context;
}
