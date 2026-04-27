import {
  Bot,
  Bug,
  Code2,
  Command,
  Compass,
  FileCode2,
  FolderGit2,
  Globe2,
  Keyboard,
  Layers3,
  Lightbulb,
  MessageSquare,
  MonitorUp,
  MousePointer2,
  Play,
  PlugZap,
  Share2,
  Sparkles,
  TerminalSquare,
  Workflow,
} from "lucide-react";

export type CommunityTag = "Workflows" | "Macros" | "Bugs" | "Ideas" | "Showcase";

export type CommentNode = {
  id: string;
  author: string;
  avatar: string;
  body: string;
  score: number;
  createdAt: string;
  replies?: CommentNode[];
};

export type CommunityPost = {
  id: string;
  title: string;
  description: string;
  tag: CommunityTag;
  author: string;
  avatar: string;
  score: number;
  comments: CommentNode[];
  createdAt: string;
  media?: string;
  relatedDocs: string[];
  relatedFeatures: string[];
};

export type FeatureItem = {
  id: string;
  title: string;
  description: string;
  icon: typeof Workflow;
  docsHref: string;
  accent: string;
  preview: string[];
};

export type DocItem = {
  id: string;
  section: "Getting Started" | "Workflows" | "Macros" | "Commands" | "Integrations" | "Settings";
  title: string;
  description: string;
  relatedFeatures: string[];
  steps: string[];
  snippet?: string;
};

export const navigationItems = [
  { label: "Community", href: "/community", icon: MessageSquare },
  { label: "Features", href: "/features", icon: Layers3 },
  { label: "Docs", href: "/docs", icon: FileCode2 },
  { label: "Workflows", href: "/features#workflows", icon: Workflow },
  { label: "In-App", href: "/features#in-app", icon: MonitorUp },
  { label: "Templates", href: "/docs#workflow-templates", icon: FolderGit2 },
  { label: "Integrations", href: "/docs#integrations", icon: PlugZap },
];

export const communityTags: CommunityTag[] = ["Workflows", "Macros", "Bugs", "Ideas", "Showcase"];

export const features: FeatureItem[] = [
  {
    id: "workflows",
    title: "Workflows",
    description: "Build visual automation flows that open apps, run commands, branch into repeatable setup routines, and stay editable.",
    icon: Workflow,
    docsHref: "/docs#workflows",
    accent: "from-sky-400 to-blue-600",
    preview: ["Open VS Code", "Start API", "Launch browser", "Warm local model"],
  },
  {
    id: "macros",
    title: "Macros",
    description: "Automate keyboard, mouse, text entry, hotkeys, waits, and app-level gestures without hiding the steps from the user.",
    icon: Keyboard,
    docsHref: "/docs#macros",
    accent: "from-violet-400 to-fuchsia-600",
    preview: ["Move mouse", "Press hotkey", "Type text", "Delay 500ms"],
  },
  {
    id: "in-app",
    title: "In-App Automation",
    description: "Bind automations to a foreground desktop app and trigger them with app-aware hotkeys.",
    icon: MonitorUp,
    docsHref: "/docs#in-app-automation",
    accent: "from-emerald-400 to-teal-600",
    preview: ["Detect active app", "Match process", "Listen hotkey", "Run flow"],
  },
  {
    id: "cli",
    title: "CLI Integrations",
    description: "Use Advflow from scripts, terminals, and CI-style local routines with exportable workflow definitions.",
    icon: Command,
    docsHref: "/docs#cli-integrations",
    accent: "from-slate-500 to-slate-950",
    preview: ["advflow run", "advflow import", "advflow export", "advflow doctor"],
  },
  {
    id: "ai",
    title: "AI Workflow Generation",
    description: "Generate first-draft workflows from a prompt or project folder, then inspect and refine every node.",
    icon: Sparkles,
    docsHref: "/docs#ai-workflow-generation",
    accent: "from-amber-300 to-orange-500",
    preview: ["Scan package.json", "Infer services", "Draft nodes", "Review plan"],
  },
  {
    id: "browser",
    title: "Browser Automation",
    description: "Open browser targets, project URLs, localhost tools, docs, dashboards, and demo routes as part of a run.",
    icon: Globe2,
    docsHref: "/docs#browser-automation",
    accent: "from-cyan-400 to-indigo-600",
    preview: ["Open URL", "Restore tabs", "Focus browser", "Launch app route"],
  },
  {
    id: "commands",
    title: "Command Execution",
    description: "Run shell commands in the background or a new terminal window with timeout controls and working directories.",
    icon: TerminalSquare,
    docsHref: "/docs#commands",
    accent: "from-lime-400 to-green-700",
    preview: ["npm run dev", "cargo check", "python worker.py", "docker compose up"],
  },
];

export const docs: DocItem[] = [
  {
    id: "getting-started",
    section: "Getting Started",
    title: "Create your first automation workspace",
    description: "Install Advflow, choose local or cloud storage, and create a workflow that opens your project tools.",
    relatedFeatures: ["workflows", "commands", "browser"],
    steps: [
      "Open Advflow and choose local storage for private desktop-only workflows.",
      "Create a workflow from the Workflows page.",
      "Add openApp, runCommand, and openBrowser nodes.",
      "Run once, review the result, then save it as a reusable setup.",
    ],
  },
  {
    id: "workflows",
    section: "Workflows",
    title: "Workflow nodes and execution order",
    description: "Workflows are ordered node collections that run local desktop automation steps in a predictable sequence.",
    relatedFeatures: ["workflows", "ai"],
    steps: [
      "Name the workflow around the outcome, not the tool.",
      "Keep commands scoped to a working directory.",
      "Use delay nodes only when an app or server needs startup time.",
      "Export workflows when sharing with teammates or community posts.",
    ],
    snippet: `{
  "type": "runCommand",
  "command": "npm run dev",
  "workingDirectory": "C:/Projects/app",
  "shellType": "powershell",
  "terminalType": "background"
}`,
  },
  {
    id: "macros",
    section: "Macros",
    title: "Keyboard, mouse, hotkeys, and waits",
    description: "Macros cover direct desktop gestures such as key presses, mouse clicks, text entry, and deliberate waits.",
    relatedFeatures: ["macros", "in-app"],
    steps: [
      "Use hotkey nodes for repeatable shortcuts.",
      "Use typeText only for trusted local text.",
      "Keep mouse coordinates reserved for stable desktop layouts.",
      "Wrap fragile sequences with short delay nodes.",
    ],
    snippet: `[
  { "type": "hotkey", "keys": ["ctrl", "shift", "p"] },
  { "type": "typeText", "text": "Developer: Reload Window" },
  { "type": "pressKey", "key": "enter" }
]`,
  },
  {
    id: "commands",
    section: "Commands",
    title: "Run commands safely",
    description: "Command nodes run through your selected shell and should define a timeout, directory, and terminal behavior.",
    relatedFeatures: ["commands", "cli"],
    steps: [
      "Prefer background commands for short checks and new terminals for long-running servers.",
      "Set commandTimeoutSeconds in Settings to avoid stuck runs.",
      "Use PowerShell or cmd on Windows depending on your script needs.",
      "Review stderr when a command node fails.",
    ],
    snippet: `runCommand({
  command: "cargo check",
  workingDirectory: "C:/Users/you/project/src-tauri",
  shellType: "powershell",
  terminalType: "background"
})`,
  },
  {
    id: "integrations",
    section: "Integrations",
    title: "Apps, CLI, browser, and AI providers",
    description: "Advflow can connect desktop apps, shells, browser routes, MongoDB storage, Gemini, and local model endpoints.",
    relatedFeatures: ["cli", "browser", "ai"],
    steps: [
      "Pick preferred editor and browser in Settings.",
      "Add Gemini or local model credentials only when using AI generation.",
      "Use MongoDB storage when workflows need sync across machines.",
      "Export shared workflows before posting them in Community.",
    ],
  },
  {
    id: "settings",
    section: "Settings",
    title: "Storage, timeouts, launch behavior, and developer mode",
    description: "Settings control local/cloud storage, command timeouts, compact UI, destructive confirmations, and startup behavior.",
    relatedFeatures: ["commands", "workflows"],
    steps: [
      "Keep confirmDestructiveActions enabled for shared libraries.",
      "Tune commandTimeoutSeconds for your slowest safe command.",
      "Use syncOnOpen only with a known-good MongoDB connection.",
      "Enable developer mode while testing workflows and community exports.",
    ],
  },
];

export const communityPosts: CommunityPost[] = [
  {
    id: "post-1",
    title: "My one-click React + Tauri startup flow",
    description: "Shared a workflow that opens VS Code, starts Vite, runs cargo check, and launches the docs tab. Curious how others handle long-running commands.",
    tag: "Showcase",
    author: "Mira Chen",
    avatar: "MC",
    score: 284,
    createdAt: "2h ago",
    media: "Workflow export attached",
    relatedDocs: ["workflows", "commands"],
    relatedFeatures: ["workflows", "commands"],
    comments: [
      {
        id: "c-1",
        author: "Noah Reed",
        avatar: "NR",
        body: "I split server starts into new terminal windows and keep checks in background mode. It makes failures much easier to scan.",
        score: 52,
        createdAt: "1h ago",
        replies: [
          {
            id: "c-1-1",
            author: "Mira Chen",
            avatar: "MC",
            body: "That is cleaner. I moved Vite to newWindow and left cargo check as background.",
            score: 21,
            createdAt: "42m ago",
          },
        ],
      },
    ],
  },
  {
    id: "post-2",
    title: "Idea: shareable macro packs for editors",
    description: "Would love packs for VS Code, Cursor, and browser testing. Maybe docs can map each pack to hotkeys and safe defaults.",
    tag: "Ideas",
    author: "Arjun Patel",
    avatar: "AP",
    score: 168,
    createdAt: "5h ago",
    relatedDocs: ["macros", "integrations"],
    relatedFeatures: ["macros", "in-app"],
    comments: [
      {
        id: "c-2",
        author: "Lena Ortiz",
        avatar: "LO",
        body: "I would use this daily. App-specific hotkeys plus a docs page per pack would feel very approachable.",
        score: 37,
        createdAt: "3h ago",
      },
    ],
  },
  {
    id: "post-3",
    title: "Bug report template for command timeout issues",
    description: "When a command blocks, the report should include shellType, terminalType, timeout, working directory, and stderr.",
    tag: "Bugs",
    author: "Sam Rivera",
    avatar: "SR",
    score: 96,
    createdAt: "1d ago",
    relatedDocs: ["commands", "settings"],
    relatedFeatures: ["commands"],
    comments: [
      {
        id: "c-3",
        author: "Priya Nair",
        avatar: "PN",
        body: "Adding OS and whether the command opens a child process would help too.",
        score: 19,
        createdAt: "20h ago",
      },
    ],
  },
];

export const quickActions = [
  { label: "Ask AI", icon: Bot },
  { label: "Report Bug", icon: Bug },
  { label: "Share Flow", icon: Share2 },
  { label: "Roadmap", icon: Compass },
  { label: "Ideas", icon: Lightbulb },
  { label: "Run CLI", icon: Play },
  { label: "Open App", icon: MousePointer2 },
  { label: "Snippets", icon: Code2 },
];

