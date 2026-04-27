import {
  Gauge,
  LayoutDashboard,
  Network,
  Settings2,
  WandSparkles,
} from "lucide-react";
import type { Workflow } from "@/types/workflow";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
};

export type Template = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  kind?: "react" | "nextjs" | "fullstack";
  payload: Partial<Workflow>;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/workflows", label: "Workflows", icon: LayoutDashboard },
  { to: "/templates", label: "Templates", icon: WandSparkles },
  { to: "/runs", label: "Runs", icon: Gauge },
  { to: "/integrations", label: "Integrations", icon: Network },
  { to: "/settings", label: "Settings", icon: Settings2 },
];

export const TEMPLATES: Template[] = [
  {
    id: "fullstack-dev",
    name: "Fullstack Dev",
    description: "Open a root project, install frontend and backend deps, then run both dev servers.",
    tags: ["fullstack", "frontend", "backend"],
    kind: "fullstack",
    payload: {
      name: "Fullstack Dev",
      description: "Runs frontend and backend from root/frontend and root/backend.",
      tags: ["fullstack", "dev"],
    },
  },
  {
    id: "react-dev",
    name: "React Dev",
    description: "Open a React project, install dependencies, run the dev server, and open preview.",
    tags: ["react", "frontend"],
    kind: "react",
    payload: {
      name: "React Dev",
      description: "Runs a React development server from the selected project root.",
      tags: ["react", "dev"],
    },
  },
  {
    id: "nextjs-dev",
    name: "Next.js Dev",
    description: "Open a Next.js app and run it from the selected root directory.",
    tags: ["nextjs", "frontend"],
    kind: "nextjs",
    payload: {
      name: "Next.js Dev",
      description: "Runs a Next.js development server from the selected project root.",
      tags: ["nextjs", "dev"],
    },
  },
];
