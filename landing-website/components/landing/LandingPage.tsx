"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  ClipboardList,
  Coffee,
  Command,
  Download,
  HeartHandshake,
  GitBranch,
  Github,
  Layers3,
  MousePointerClick,
  Monitor,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Workflow,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

type LandingPageProps = {
  stars: string;
};

const githubUrl = "https://github.com/Razin-developer/adv.flow/";
const buyMeACoffeeUrl = "https://www.buymeacoffee.com/razindeveloper";

const heroMetrics = [
  {
    label: "Open source",
    value: "100%",
    detail: "Inspect the code, fork the repo, ship it.",
    icon: GitBranch,
  },
  {
    label: "Desktop + CLI",
    value: "2-in-1",
    detail: "Visual app and a companion CLI for repeat work.",
    icon: TerminalSquare,
  },
  {
    label: "Flow blocks",
    value: "50+",
    detail: "Apps, shell, browser, and AI-assisted steps.",
    icon: Workflow,
  },
];

const featureSections = [
  {
    eyebrow: "Flow orchestration",
    title: "Model your setup like a real system, not a checklist.",
    body:
      "Chain apps, shell commands, browsers, and AI-assisted steps into one deliberate launch sequence with clear execution order and transparent reruns.",
    bullets: [
      "Visual blocks with dependency-aware startup logic",
      "Real local workflows for terminals, browsers, apps, and scripts",
      "Inspectable actions so nothing feels hidden behind automation",
    ],
  },
  {
    eyebrow: "Project-aware setup",
    title: "Generate a useful starting workflow from the repo in front of you.",
    body:
      "Adv.Flow can detect likely startup commands, local ports, and supporting tooling, then hand you a clean draft instead of a blank canvas.",
    bullets: [
      "Recognizes common frontend and backend boot patterns",
      "Surfaces likely localhost routes and project entry points",
      "Keeps every generated step editable and easy to refine",
    ],
  },
];

const useCases = [
  {
    title: "Developers",
    body: "Open the editor, boot services, restore tabs, and get back into flow without rebuilding the same setup every morning.",
  },
  {
    title: "Startups",
    body: "Share a clean project startup routine so new teammates know exactly what to run and what should open.",
  },
  {
    title: "Automation nerds",
    body: "Turn keyboard shortcuts, app launches, browser tabs, and shell commands into one visible routine you can improve over time.",
  },
];

const productBasics = [
  {
    title: "What it is",
    body: "Adv.Flow is a desktop app for building visual automation flows. A flow can open apps, run commands, launch browser pages, wait for services, and chain steps in the order you choose.",
    icon: Workflow,
  },
  {
    title: "Who it helps",
    body: "It is for developers, makers, and small teams who repeat the same local setup: start servers, open folders, restore docs, run checks, and prepare a workspace.",
    icon: Monitor,
  },
  {
    title: "Why it feels safer",
    body: "Every step stays visible and editable. You can inspect what runs, change commands, reorder nodes, and keep your automation local.",
    icon: ShieldCheck,
  },
];

const gettingStartedSteps = [
  {
    title: "Download the desktop app",
    body: "Install Adv.Flow, open it, and create a workspace for your project or daily routine.",
    icon: Download,
  },
  {
    title: "Create or generate a flow",
    body: "Start from a blank canvas, scan a project folder, or draft a workflow from the commands you already run.",
    icon: Sparkles,
  },
  {
    title: "Add useful steps",
    body: "Combine app launch, command, browser, delay, macro, and AI-assisted blocks into one repeatable sequence.",
    icon: ClipboardList,
  },
  {
    title: "Run, refine, and reuse",
    body: "Run the flow, check each result, adjust anything that needs polish, then make it your one-click startup.",
    icon: Play,
  },
];

const workflowRecipes = [
  {
    title: "Full-stack project start",
    body: "Open VS Code, start the API, start the frontend, launch localhost, and open your task board.",
    steps: ["Open editor", "Run backend", "Run frontend", "Open browser"],
  },
  {
    title: "Content creation setup",
    body: "Open notes, browser research, assets folder, design app, and a writing timer in the same order every time.",
    steps: ["Open notes", "Open assets", "Launch browser", "Start timer"],
  },
  {
    title: "Release checklist",
    body: "Run checks, open release notes, launch GitHub, export build folders, and keep the routine consistent.",
    steps: ["Run tests", "Open changelog", "Open GitHub", "Package build"],
  },
];

const faqItems = [
  {
    question: "Do I need to code to use Adv.Flow?",
    answer: "No. Most flows can be built visually. Developers can still add commands and advanced steps when they want more control.",
  },
  {
    question: "Can I see what an automation will do?",
    answer: "Yes. The point of Adv.Flow is visible automation: each app launch, command, browser action, delay, and macro stays editable.",
  },
  {
    question: "Is it only for software projects?",
    answer: "No. It is strongest for developer workflows, but it also works well for any repeated desktop routine that mixes apps, tabs, commands, and files.",
  },
  {
    question: "Why should I use this instead of a script?",
    answer: "Scripts are great, but visual flows are easier to inspect, share, reorder, and tune when your routine includes apps, browser pages, waits, and manual context.",
  },
];

const supportActions = [
  {
    title: "Star us on GitHub",
    body: "Support visibility, follow releases, and help more developers discover Adv.Flow.",
    href: githubUrl,
    external: true,
    className: "button-github",
    icon: Github,
    label: "Star on GitHub",
  },
  {
    title: "Buy me a coffee",
    body: "Help fund polish, packaging, docs, and the small details that make the product better.",
    href: buyMeACoffeeUrl,
    external: true,
    className: "button-coffee",
    icon: Coffee,
    label: "Support the project",
  },
  {
    title: "Free download",
    body: "Try the desktop app right now and start building your own repeatable local workflows.",
    href: "/download",
    external: false,
    className: "button-primary",
    icon: Download,
    label: "Download free",
  },
  {
    title: "Open source forever",
    body: "Inspect the code, fork the product, and shape the roadmap in the open with the community.",
    href: githubUrl,
    external: true,
    className: "button-open-source",
    icon: HeartHandshake,
    label: "Explore the source",
  },
];

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="eyebrow-premium">{eyebrow}</div>
      <h2 className="mt-5 text-[clamp(2rem,4vw,3.5rem)] font-semibold tracking-[-0.06em] text-slate-950">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-[17px]">
        {body}
      </p>
    </div>
  );
}

function PrimaryButton({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a className="button-primary group" href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link className="button-primary group" href={href}>
      {children}
    </Link>
  );
}

function SecondaryButton({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a className="button-secondary group" href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link className="button-secondary group" href={href}>
      {children}
    </Link>
  );
}

function MarketingHeader({ stars }: { stars: string }) {
  return (
    <header className="marketing-topbar">
      <div className="window-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="brand-lockup">
        <img src="/advflow-logo.svg" alt="Adv.Flow" className="brand-marketing-logo" />
        <span>Adv.Flow</span>
      </div>
      <nav className="marketing-nav">
        <a href="#what-is-it">What it is</a>
        <a href="#features">Features</a>
        <a href="#guide">How to use</a>
        <a href="#examples">Examples</a>
        <Link href="/download">Download</Link>
        {/* <a href="#faq">FAQ</a> */}
        {/* <a href="/docs">How to use</a> */}
        {/* <a href="/features">Features</a> */}
        {/* <a href="#pricing">Pricing</a> */}
      </nav>
      <div className="marketing-actions">
        <a className="button-secondary nav-button" href={githubUrl} target="_blank" rel="noreferrer">
          <Github className="h-4 w-4" />
          <span>Star</span>
          <span className="rounded-full bg-slate-950/6 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            {stars}
          </span>
        </a>
        <Link className="button-primary nav-button" href="/download">
          Get Adv.Flow
        </Link>
      </div>
    </header>
  );
}

function StickyMobileCta() {
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 md:hidden">
      <div className="glass-card flex items-center justify-between rounded-[22px] px-4 py-3 shadow-[0_20px_70px_rgba(15,23,42,0.22)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Adv.Flow</p>
          <p className="text-sm font-semibold tracking-[-0.03em] text-slate-950">Automate your dev setup</p>
        </div>
        <Link className="button-primary min-h-11 px-5 text-sm" href="/download">
          Download
        </Link>
      </div>
    </div>
  );
}

export default function LandingPage({ stars }: LandingPageProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative overflow-x-hidden bg-white text-slate-950">
      {/* <div aria-hidden="true" className="page-background-glow" /> */}

      <section className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-6 sm:px-6 sm:pt-10 lg:px-8 lg:pb-16">
        <div className="">
          <MarketingHeader stars={stars} />

          <div className="px-3 pb-4 pt-12 text-center sm:px-6 sm:pt-16">
            <div className="eyebrow mx-auto">
              <GitBranch size={12} />
              Open-source desktop automation
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.6rem,5vw,5rem)] font-semibold leading-[1.02] tracking-[-0.08em] text-slate-950">
              Start every project with one clear flow
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-[17px]">
              Adv.Flow helps you turn repeated desktop work into a visual, repeatable routine: open apps, run commands,
              launch browser tabs, wait for services, and get your workspace ready without rebuilding it by hand.
            </p>

            <div className="hero-cta-row mt-10 flex flex-wrap items-center justify-center gap-3">
              <PrimaryButton href="/download">
                <Download className="h-4 w-4" />
                Download free
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </PrimaryButton>
              <a className="button-github" href={githubUrl} target="_blank" rel="noreferrer">
                <Github className="h-4 w-4" />
                Star on GitHub
                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {stars}
                </span>
              </a>
              <a className="button-coffee" href={buyMeACoffeeUrl} target="_blank" rel="noreferrer">
                <Coffee className="h-4 w-4" />
                Buy me a coffee
              </a>
              <SecondaryButton href="#guide">
                <BookOpen className="h-4 w-4" />
                See how it works
              </SecondaryButton>
            </div>

            <div className="hero-trust-row mt-10 flex flex-wrap items-center justify-center gap-3">
              <div className="trust-pill">
                <Github className="h-4 w-4" />
                <span>{stars} GitHub stars</span>
              </div>
              <div className="trust-pill">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>MIT licensed</span>
              </div>
              <div className="trust-pill">
                <Monitor className="h-4 w-4 text-sky-500" />
                <span>Desktop + CLI</span>
              </div>
              <div className="trust-pill">
                <MousePointerClick className="h-4 w-4 text-violet-500" />
                <span>Visual builder</span>
              </div>
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <article className="rounded-[24px] border border-white/80 bg-white/82 p-5 text-left shadow-[0_18px_50px_rgba(148,163,184,0.14)]">
                <div className="flex flex-col gap-3">
                  <span className="inline-grid h-9 w-9 place-items-center rounded-2xl bg-[linear-gradient(135deg,#dbeafe,#eef2ff)] text-slate-950">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <small className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Desktop flows</small>
                </div>
                <div className="mt-6">
                  <strong className="text-[1.9rem] font-semibold tracking-[-0.06em] text-slate-950">12,500+</strong>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Reusable automations for project startup and local routines.
                  </p>
                </div>
              </article>

              <article className="rounded-[24px] border border-white/80 bg-white/82 p-5 text-left shadow-[0_18px_50px_rgba(148,163,184,0.14)]">
                <small className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Block mix</small>
                <div className="mt-5 grid h-24 grid-cols-5 items-end gap-2">
                  <span className="block h-[46%] rounded-full bg-gradient-to-b from-cyan-200/60 to-sky-500/85 opacity-50" />
                  <span className="block h-[58%] rounded-full bg-gradient-to-b from-cyan-200/60 to-sky-500/85 opacity-60" />
                  <span className="block h-[72%] rounded-full bg-gradient-to-b from-cyan-200/60 to-sky-500/85 opacity-75" />
                  <span className="block h-[88%] rounded-full bg-gradient-to-b from-cyan-200/60 to-sky-500/85" />
                  <span className="block h-[66%] rounded-full bg-gradient-to-b from-cyan-200/60 to-sky-500/85 opacity-65" />
                </div>
                <div className="mt-3 flex justify-between text-[11px] text-slate-500">
                  <span>Apps</span>
                  <span>Shell</span>
                  <span>Browser</span>
                  <span>AI</span>
                  <span>Wait</span>
                </div>
              </article>

              <article className="rounded-[24px] border border-transparent bg-[linear-gradient(135deg,#0f172a,#1d4ed8_65%,#67e8f9)] p-5 text-left text-white shadow-[0_24px_80px_rgba(37,99,235,0.22)]">
                <span className="inline-grid h-9 w-9 place-items-center rounded-2xl bg-white/12 text-white">
                  <Layers3 className="h-4 w-4" />
                </span>
                <small className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Community</small>
                <strong className="mt-3 block text-[1.9rem] font-semibold tracking-[-0.06em]">Open source</strong>
                <p className="mt-2 text-sm leading-6 text-white/78">
                  Fork it, ship it, build your own workflow system on top.
                </p>
              </article>

              {heroMetrics.map((metric) => (
                <article
                  key={metric.label}
                  className="rounded-[24px] border border-white/80 bg-white/82 p-5 text-left shadow-[0_18px_50px_rgba(148,163,184,0.14)]"
                >
                  <div className="flex flex-col gap-3">
                    <span className="inline-grid h-9 w-9 place-items-center rounded-2xl bg-[linear-gradient(135deg,#dbeafe,#eef2ff)] text-slate-950">
                      <metric.icon className="h-4 w-4" />
                    </span>
                    <small className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {metric.label}
                    </small>
                  </div>
                  <div className="mt-6">
                    <strong className="text-[1.9rem] font-semibold tracking-[-0.06em] text-slate-950">
                      {metric.value}
                    </strong>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{metric.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell pt-0" id="what-is-it">
        <div className="glass-card rounded-[32px] px-6 py-6 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.62fr_1.38fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">What the app is for</p>
              <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.8rem)] font-semibold tracking-[-0.06em] text-slate-950">
                A calm control panel for the work you repeat.
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                If your day starts with opening the same tools, running the same commands, and checking the same tabs,
                Adv.Flow turns that routine into something you can run, understand, and improve.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {productBasics.map((item) => (
                <div key={item.title} className="rounded-[24px] border border-white/80 bg-white/75 p-5">
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#dbeafe,#eef2ff)] text-slate-950">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell" id="features">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to turn setup work into a reusable flow."
          body="Adv.Flow combines visual planning with real desktop actions, so you can understand exactly what the app controls before you run anything."
        />

        <div className="mt-14 space-y-8">
          {featureSections.map((feature, index) => (
            <div
              key={feature.title}
              className="grid gap-8 overflow-hidden rounded-[36px] border border-white/70 bg-white/72 p-6 shadow-[0_30px_90px_rgba(148,163,184,0.16)] backdrop-blur-xl lg:grid-cols-2 lg:p-8"
            >
              <div className={index === 1 ? "lg:order-2" : undefined}>
                <div className="eyebrow-premium">{feature.eyebrow}</div>
                <h3 className="mt-5 max-w-lg text-[clamp(1.9rem,3vw,3rem)] font-semibold tracking-[-0.06em] text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-600 sm:text-[17px]">{feature.body}</p>
                <div className="mt-8 space-y-3">
                  {feature.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-start gap-3 rounded-[20px] border border-slate-200/70 bg-white/80 px-4 py-3">
                      <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-xl bg-[linear-gradient(135deg,#dbeafe,#eef2ff)] text-slate-950">
                        <Check className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-6 text-slate-700">{bullet}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={`relative min-h-[360px] overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,#f8fbff,#eef4ff)] p-5 ${index === 1 ? "lg:order-1" : ""
                  }`}
              >
                {index === 0 ? (
                  <>
                    <div className="absolute left-5 top-5 rounded-[22px] border border-white/80 bg-white/80 p-4 shadow-[0_18px_60px_rgba(148,163,184,0.16)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Block canvas</p>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white">
                          <TerminalSquare className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">Run `pnpm dev`</p>
                          <p className="text-xs text-slate-500">Depends on repo scan</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute right-6 top-16 h-40 w-40 rounded-full bg-cyan-200/60 blur-3xl" />
                    <div className="absolute inset-x-6 bottom-6 rounded-[28px] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_25px_80px_rgba(15,23,42,0.3)]">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.24em] text-white/45">Execution timeline</span>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/65">Deterministic</span>
                      </div>
                      <div className="grid gap-3">
                        {["Open editor", "Boot API", "Start web", "Open localhost"].map((item, idx) => (
                          <div key={item} className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
                            <div className="h-10 flex-1 rounded-2xl bg-white/6 px-4 py-2 text-sm text-white/80">{item}</div>
                            <div className="text-xs text-white/45">{idx + 1}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-4">
                      <div className="rounded-[24px] border border-white/80 bg-white/80 p-4 shadow-[0_14px_45px_rgba(148,163,184,0.16)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Repo scan</p>
                            <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950">adv.flow</p>
                          </div>
                          <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Ready</div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">`npm run dev`</div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">Port `3000`</div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">Desktop app</div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">GitHub repo</div>
                        </div>
                      </div>
                      <div className="rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#0f172a,#1d4ed8_65%,#67e8f9)] p-5 text-white shadow-[0_24px_80px_rgba(37,99,235,0.22)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-white/55">Suggested automation</p>
                            <p className="mt-2 text-xl font-semibold tracking-[-0.04em]">Frontend bootstrap flow</p>
                          </div>
                          <Zap className="h-8 w-8 text-cyan-200" />
                        </div>
                        <div className="mt-6 space-y-3">
                          {["Install dependencies", "Start dev server", "Launch browser", "Open issue tracker"].map((item) => (
                            <div key={item} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/85">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell" id="guide">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="max-w-xl">
            <div className="eyebrow-premium">How to use it</div>
            <h2 className="mt-5 text-[clamp(2rem,4vw,3.75rem)] font-semibold tracking-[-0.06em] text-slate-950">
              Build your first useful flow in a few clear moves.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-600 sm:text-[17px]">
              You do not need to start with a perfect automation. Start with the routine you already repeat, turn each
              part into a visible step, run it once, and refine it until it feels reliable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryButton href="/download">
                <Download className="h-4 w-4" />
                Start with the app
              </PrimaryButton>
              <SecondaryButton href="/docs">
                <BookOpen className="h-4 w-4" />
                Read docs
              </SecondaryButton>
            </div>
          </div>

          <div className="glass-card rounded-[32px] p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">First run guide</p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">From install to reusable flow</h3>
              </div>
              <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600">
                4 steps
              </div>
            </div>

            <div className="grid gap-4">
              {gettingStartedSteps.map((item, index) => (
                <div key={item.title} className="rounded-[24px] border border-white/80 bg-white/80 p-4 shadow-[0_18px_48px_rgba(148,163,184,0.12)]">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#dbeafe,#eef2ff)] text-slate-950">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-950">{index + 1}. {item.title}</h4>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell" id="examples">
        <SectionHeading
          eyebrow="Example flows"
          title="Pick a routine and make it repeatable."
          body="These examples show how Adv.Flow fits into real days, from developer startup to content work and release prep."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {workflowRecipes.map((recipe) => (
            <article
              key={recipe.title}
              className="group relative overflow-hidden rounded-[30px] border border-white/80 bg-white/82 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.14)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_90px_rgba(37,99,235,0.16)]"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#22c55e,#38bdf8,#6366f1)] opacity-70" />
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white">
                  <Rocket className="h-5 w-5" />
                </div>
                <h3 className="text-[1.35rem] font-semibold tracking-[-0.05em] text-slate-950">{recipe.title}</h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{recipe.body}</p>
              <div className="mt-6 grid gap-3">
                {recipe.steps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                    <span className="grid h-7 w-7 place-items-center rounded-xl bg-white text-xs font-semibold text-slate-600 shadow-[0_8px_22px_rgba(148,163,184,0.14)]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{step}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell" id="use-cases">
        <SectionHeading
          eyebrow="Use cases"
          title="Built for the people who obsess over setup speed, clarity, and repeatability."
          body="Adv.Flow is easiest to understand when visitors see themselves in the routine: developers, small teams, power users, and anyone who repeats desktop setup."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {useCases.map((item) => (
            <article
              key={item.title}
              className="group relative h-full overflow-hidden rounded-[30px] border border-white/80 bg-white/78 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.14)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_90px_rgba(37,99,235,0.16)]"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#67e8f9,#60a5fa,#818cf8)] opacity-70" />
              <h3 className="mt-5 text-[1.6rem] font-semibold tracking-[-0.05em] text-slate-950">{item.title}</h3>
              <p className="mt-4 text-[15px] leading-7 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell pt-0">
        <SectionHeading
          eyebrow="Support Adv.Flow"
          title="Back the project in the way that fits you best."
          body="Visibility, downloads, open-source engagement, and direct support all help Adv.Flow keep improving."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {supportActions.map((action) => {
            const Icon = action.icon;

            return (
              <article key={action.title} className="support-tile flex h-full flex-col">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <Icon className="h-3.5 w-3.5" />
                  Support
                </div>
                <h3 className="mt-5 text-[1.35rem] font-semibold tracking-[-0.05em] text-slate-950">{action.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{action.body}</p>
                <div className="mt-6">
                  {action.external ? (
                    <a className={action.className} href={action.href} target="_blank" rel="noreferrer">
                      <Icon className="h-4 w-4" />
                      {action.label}
                    </a>
                  ) : (
                    <Link className={action.className} href={action.href}>
                      <Icon className="h-4 w-4" />
                      {action.label}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-shell">
        <div className="grid gap-8 rounded-[36px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(240,247,255,0.9))] p-6 shadow-[0_30px_90px_rgba(148,163,184,0.16)] backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
          <div className="space-y-5">
            <div className="eyebrow-premium">Open source</div>
            <h2 className="max-w-lg text-[clamp(2rem,4vw,3.5rem)] font-semibold tracking-[-0.06em] text-slate-950">
              The GitHub story is part of the product story.
            </h2>
            <p className="max-w-xl text-[15px] leading-7 text-slate-600 sm:text-[17px]">
              Adv.Flow earns trust by showing the work. The repo, releases, and implementation details are part of the
              pitch, not buried behind it.
            </p>
            <div className="flex flex-wrap gap-3">
              <a className="button-github" href={githubUrl} target="_blank" rel="noreferrer">
                <Github className="h-4 w-4" />
                Visit GitHub
              </a>
              <PrimaryButton href="/download">
                <Download className="h-4 w-4" />
                Try the desktop app
              </PrimaryButton>
              <a className="button-coffee" href={buyMeACoffeeUrl} target="_blank" rel="noreferrer">
                <Coffee className="h-4 w-4" />
                Buy me a coffee
              </a>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/80 bg-slate-950 p-6 text-white shadow-[0_22px_80px_rgba(15,23,42,0.28)]">
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">Repository signal</p>
              <div className="mt-5 flex items-end gap-3">
                <span className="text-5xl font-semibold tracking-[-0.08em]">{stars}</span>
                <span className="pb-1 text-sm text-white/55">GitHub stars</span>
              </div>
              <div className="mt-6 space-y-3">
                {["Public roadmap and issues", "Forkable codebase", "Transparent releases"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/80">
                    <Check className="h-4 w-4 text-cyan-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/90 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Why it matters</p>
              <div className="mt-5 space-y-4">
                {[
                  "Teams can validate what actually runs on their machines.",
                  "Power users can extend the product instead of waiting on a vendor roadmap.",
                  "Design polish and implementation honesty can coexist in one tool.",
                ].map((item) => (
                  <div key={item} className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell" id="faq">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <div className="eyebrow-premium">Questions</div>
            <h2 className="mt-5 text-[clamp(2rem,4vw,3.5rem)] font-semibold tracking-[-0.06em] text-slate-950">
              Quick answers before you download.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-600 sm:text-[17px]">
              Learn what Adv.Flow does, how it fits into your day, and why the automation stays understandable.
            </p>
          </div>
          <div className="grid gap-4">
            {faqItems.map((item) => (
              <article key={item.question} className="rounded-[26px] border border-white/80 bg-white/82 p-5 shadow-[0_18px_50px_rgba(148,163,184,0.12)]">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-[linear-gradient(135deg,#dbeafe,#eef2ff)] text-slate-950">
                    <CircleHelp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold tracking-[-0.03em] text-slate-950">{item.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell" id="pricing">
        <SectionHeading
          eyebrow="Pricing"
          title="Free to start, open to inspect, easy to support."
          body="Download the community app for core desktop automation. Support the project through GitHub, feedback, contributions, or direct sponsorship."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[32px] border-transparent bg-[linear-gradient(135deg,#0f172a,#1d4ed8_65%,#67e8f9)] p-6 text-white shadow-[0_24px_80px_rgba(148,163,184,0.14)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/55">Community</p>
                <div className="mt-4 text-[3rem] font-semibold tracking-[-0.08em]">Free</div>
                <p className="mt-3 text-sm leading-6 text-white/72">Core desktop automation for local workflows.</p>
              </div>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
                Recommended
              </span>
            </div>
            <div className="mt-8 space-y-3">
              {["Visual workflow builder", "Local flow runs", "CLI companion", "Open-source codebase"].map((bullet) => (
                <div key={bullet} className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/8 px-4 py-3 text-sm text-white/82">
                  <Check className="h-4 w-4 text-cyan-300" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link className="button-light-on-dark" href="/download">
                Download app
              </Link>
            </div>
          </article>

          <article className="rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(148,163,184,0.14)] backdrop-blur-xl">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Supporter</p>
              <div className="mt-4 text-[3rem] font-semibold tracking-[-0.08em] text-slate-950">GitHub</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">Back the roadmap with code, issues, and stars.</p>
            </div>
            <div className="mt-8 space-y-3">
              {["Star the repo", "Open issues and PRs", "Fork your own variants", "Follow releases in public"].map((bullet) => (
                <div key={bullet} className="flex items-center gap-3 rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                  <Check className="h-4 w-4 text-sky-500" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <a className="button-secondary" href={githubUrl} target="_blank" rel="noreferrer">
                View repository
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="section-shell pb-28 sm:pb-24">
        <div className="overflow-hidden rounded-[40px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.32),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.22),transparent_26%),linear-gradient(135deg,#ffffff,#eef4ff)] p-6 shadow-[0_36px_100px_rgba(148,163,184,0.18)] sm:p-8 lg:p-10">
          <div className="mx-auto max-w-[760px] text-center">
            <div className="eyebrow-premium mx-auto">Final call</div>
            <h2 className="mt-5 text-[clamp(2.4rem,5vw,4.6rem)] font-semibold tracking-[-0.08em] text-slate-950">
              Turn setup friction into one deliberate command.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-7 text-slate-600 sm:text-[18px]">
              Adv.Flow gives your day a cleaner starting point: less bootstrapping, less tab juggling, more time actually building.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <PrimaryButton href="/download">
                <Download className="h-4 w-4" />
                Download Adv.Flow
              </PrimaryButton>
              <a className="button-github" href={githubUrl} target="_blank" rel="noreferrer">
                <Github className="h-4 w-4" />
                Star us on GitHub
              </a>
              <a className="button-coffee" href={buyMeACoffeeUrl} target="_blank" rel="noreferrer">
                <Coffee className="h-4 w-4" />
                Support with coffee
              </a>
              <a className="button-open-source" href={githubUrl} target="_blank" rel="noreferrer">
                <HeartHandshake className="h-4 w-4" />
                Open source forever
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/50 bg-white/45">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-[16px] bg-[linear-gradient(135deg,#0f172a,#2563eb_60%,#67e8f9)] shadow-[0_16px_40px_rgba(37,99,235,0.26)]">
                <Workflow className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Adv.Flow</p>
                <p className="text-sm text-slate-600">Desktop automation for modern developer workflows.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Product</p>
              <div className="mt-4 space-y-3">
                <Link className="block text-sm text-slate-600 transition hover:text-slate-950" href="/download">
                  Download
                </Link>
                <a className="block text-sm text-slate-600 transition hover:text-slate-950" href="/features">
                  Features
                </a>
                <a className="block text-sm text-slate-600 transition hover:text-slate-950" href="/community">
                  Community
                </a>
                <a className="block text-sm text-slate-600 transition hover:text-slate-950" href="/docs">
                  Documentation
                </a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Open source</p>
              <div className="mt-4 space-y-3">
                <a className="block text-sm text-slate-600 transition hover:text-slate-950" href={githubUrl} target="_blank" rel="noreferrer">
                  GitHub
                </a>
                <a className="block text-sm text-slate-600 transition hover:text-slate-950" href={`${githubUrl}issues`} target="_blank" rel="noreferrer">
                  Issues
                </a>
                <a className="block text-sm text-slate-600 transition hover:text-slate-950" href={buyMeACoffeeUrl} target="_blank" rel="noreferrer">
                  Buy me a coffee
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {mounted ? <StickyMobileCta /> : null}
    </div>
  );
}
