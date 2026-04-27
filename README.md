# Adv.Flow

Adv.Flow is an open-source desktop automation tool for developers who want a faster, cleaner way to start their local workflow.

Build visual flows to open apps, launch terminals, restore browser context, and run repeatable setup steps without bouncing through the same checklist every day.

Live landing page: [https://advflow.zydcode.in](https://advflow.zydcode.in)

## Why Adv.Flow

Most local setup is still a ritual:

- Open the repo
- Start the frontend
- Start the backend
- Open the browser
- Restore docs, tabs, notes, and tools

Adv.Flow turns that into a reusable flow you can run on demand.

It is designed for:

- Developers who want faster project startup
- Teams who want repeatable onboarding and setup
- Power users who like building their own automation systems

## What You Get

- Desktop-first workflow automation
- Visual flow builder for local tasks
- CLI companion for terminal-driven runs
- Open-source codebase you can inspect and fork
- Landing website for distribution, download capture, and product marketing
- Admin dashboard for analytics and download lead visibility

## Product Surfaces

### 1. Desktop app

The desktop app lives in [`tauri`](C:/Users/razin/Desktop/Products/adv.flow/tauri) and is built with:

- Tauri
- React
- TypeScript
- React Flow
- Zustand

It includes:

- A workflow canvas
- Block-based builder UI
- Execution panel
- Templates and runs pages
- In-app workflow management

### 2. CLI

The CLI lives in [`bin/advflow.js`](C:/Users/razin/Desktop/Products/adv.flow/bin/advflow.js) and lets you run stored workflows from the terminal.

Available commands:

```bash
advflow ls
advflow run <workflow-name-or-id>
```

### 3. Landing website

The public website lives in [`landing-website`](C:/Users/razin/Desktop/Products/adv.flow/landing-website) and is built with:

- Next.js
- React
- Tailwind CSS

It includes:

- Premium landing page
- Download page
- Analytics tracking
- Admin dashboard
- MongoDB-backed download lead capture
- ClickHouse-backed analytics

## Monorepo Structure

```text
adv.flow/
├─ bin/                  # CLI entrypoint
├─ landing-website/      # Next.js marketing site + admin
├─ scripts/              # Root helper scripts
├─ tauri/                # Desktop application
├─ dist-installer/       # Installer artifacts
└─ release/              # Release output
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Rust toolchain for Tauri builds
- ClickHouse instance for analytics
- MongoDB database for download leads

### Run the landing website

```bash
cd landing-website
npm install
npm run dev
```

Create `landing-website/.env.local` with:

```env
MONGODB_URI=
CLICKHOUSE_URL=
CLICKHOUSE_USERNAME=
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=default
```

### Run the desktop app

```bash
cd tauri
npm install
npm run tauri dev
```

### Install the CLI locally

From the repo root:

```bash
npm install
npm run setup:cli
```

## Build

### Landing website

```bash
cd landing-website
npm run build
```

### Desktop app installer

From the repo root:

```bash
npm run build:installer
```

Or from the Tauri app directly:

```bash
cd tauri
npm run build:installer
```

## Open Source Status

Adv.Flow is being shaped as an open-source developer tool.

That means:

- The product direction is visible
- The implementation is inspectable
- The workflow system is forkable
- Contributions are welcome

If you are opening this publicly on GitHub, this repo is already structured well for:

- Product demos via the live landing page
- Community contribution
- Release packaging
- CLI distribution
- Future plugin or template ecosystem work

## Recommended GitHub Sections

When you publish the repo, these are good links to add in the GitHub sidebar:

- Homepage: [https://advflow.zydcode.in](https://advflow.zydcode.in)
- Issues: GitHub Issues
- Discussions: optional, if you want community feedback in public

Suggested GitHub topics:

- `automation`
- `desktop-app`
- `tauri`
- `react`
- `developer-tools`
- `workflow-automation`
- `productivity`
- `open-source`

## Contributing

Contributions are welcome.

A good first contribution could be:

- New workflow blocks
- Better templates
- Desktop UX polish
- CLI improvements
- Landing page improvements
- Analytics and dashboard refinement
- Documentation cleanup

If you contribute:

1. Fork the repo
2. Create a branch
3. Make the change
4. Run the relevant build
5. Open a pull request

## Roadmap Ideas

- More workflow block types
- Import/export flows
- Better template library
- Team workflow sharing
- Plugin ecosystem
- Richer run history and debugging
- More OS-level automation support

## License

Add your preferred open-source license here before publishing publicly.

If you want a simple default for broad adoption, MIT is a strong choice.

## Support

If you like the project:

- Star it on GitHub
- Share the landing page
- Download the app
- Contribute code or feedback
- Support the creator through Buy Me a Coffee

Adv.Flow is built for people who care about reducing setup friction and making local workflows feel intentional.
