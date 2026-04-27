import { WandSparkles } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import AppShell from "@/components/AppShell";
import { TEMPLATES, type Template } from "@/data";
import { getDefaultOpenApp, getDefaultShell } from "@/lib/plugins";
import type { Workflow } from "@/types/workflow";

export default function TemplatesPage({
  onCreateFromTemplate,
}: {
  onCreateFromTemplate: (payload: Partial<Workflow>) => void;
}) {
  const childPath = (root: string, child: string) =>
    `${root.replace(/[\\/]+$/, "")}/${child}`;

  function commandNode(
    id: string,
    label: string,
    command: string,
    workingDirectory: string,
    x: number,
    y: number,
    terminalType: "background" | "newWindow" = "background",
  ): Workflow["nodes"][number] {
    return {
      id,
      type: "runCommand",
      position: { x, y },
      data: {
        id,
        type: "runCommand",
        label,
        command,
        workingDirectory,
        terminalType,
        shellType: getDefaultShell(),
      },
    };
  }

  function openNode(root: string): Workflow["nodes"][number] {
    const app = getDefaultOpenApp();
    return {
      id: "node_open_root",
      type: "openApp",
      position: { x: 80, y: 80 },
      data: {
        id: "node_open_root",
        type: "openApp",
        label: "Open project folder",
        ...app,
        folderPath: root,
      },
    };
  }

  function browserNode(id: string, x: number, y: number, url = "http://localhost:3000"): Workflow["nodes"][number] {
    return {
      id,
      type: "openBrowser",
      position: { x, y },
      data: {
        id,
        type: "openBrowser",
        label: "Open preview",
        url,
        browser: "system",
        waitMode: "delay",
        delay: 1500,
      },
    };
  }

  function edge(id: string, source: string, target: string): Workflow["edges"][number] {
    return { id, source, target, animated: true };
  }

  function buildTemplatePayload(template: Template, root: string): Partial<Workflow> {
    if (template.kind === "fullstack") {
      const frontend = childPath(root, "frontend");
      const backend = childPath(root, "backend");
      return {
        ...template.payload,
        name: "Fullstack Dev",
        nodes: [
          openNode(root),
          commandNode("node_frontend_install", "Install frontend", "npm install", frontend, 80, 260),
          commandNode("node_backend_install", "Install backend", "npm install", backend, 380, 260),
          commandNode("node_frontend_dev", "Run frontend", "npm run dev", frontend, 80, 440, "newWindow"),
          commandNode("node_backend_dev", "Run backend", "npm run dev", backend, 380, 440, "newWindow"),
          browserNode("node_preview", 680, 440),
        ],
        edges: [
          edge("edge_open_frontend_install", "node_open_root", "node_frontend_install"),
          edge("edge_open_backend_install", "node_open_root", "node_backend_install"),
          edge("edge_frontend_install_dev", "node_frontend_install", "node_frontend_dev"),
          edge("edge_backend_install_dev", "node_backend_install", "node_backend_dev"),
          edge("edge_frontend_preview", "node_frontend_dev", "node_preview"),
        ],
      };
    }

    if (template.kind === "react" || template.kind === "nextjs") {
      return {
        ...template.payload,
        name: template.kind === "nextjs" ? "Next.js Dev" : "React Dev",
        nodes: [
          openNode(root),
          commandNode("node_install", "Install dependencies", "npm install", root, 80, 260),
          commandNode("node_dev", "Run dev server", "npm run dev", root, 80, 440, "newWindow"),
          browserNode("node_preview", 360, 440),
        ],
        edges: [
          edge("edge_open_install", "node_open_root", "node_install"),
          edge("edge_install_dev", "node_install", "node_dev"),
          edge("edge_dev_preview", "node_dev", "node_preview"),
        ],
      };
    }

    return template.payload;
  }

  async function useTemplate(template: Template) {
    if (!template.kind) {
      onCreateFromTemplate(template.payload);
      return;
    }

    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose project root",
    });
    if (typeof selected !== "string") return;
    onCreateFromTemplate(buildTemplatePayload(template, selected));
  }

  return (
    <AppShell
      title="Templates"
      subtitle="Starter flows for common local development routines."
    >
      <div className="template-grid">
        {TEMPLATES.map((template) => (
          <section key={template.id} className="section-card template-card" style={{ maxHeight: "40vh" }}>
            <div className="template-icon">
              <WandSparkles size={15} />
            </div>
            <h2>{template.name}</h2>
            <p>{template.description}</p>
            <div className="tag-row">
              {template.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => void useTemplate(template)}
            >
              Use template
            </button>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
