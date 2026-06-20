<div align="center">

# Capsule

**Compact, source-linked context packs for coding agents.**

<img src="docs/demo.gif" width="740" alt="capsule init and estimate demo"/>

<br/>

[![npm](https://img.shields.io/npm/v/capsulectx?color=000&labelColor=111&label=npm&style=flat-square)](https://www.npmjs.com/package/capsulectx)
[![license](https://img.shields.io/github/license/dawitlabs/capsule?color=000&labelColor=111&style=flat-square)](LICENSE)
[![node](https://img.shields.io/node/v/capsulectx?color=000&labelColor=111&style=flat-square)](package.json)
[![ci](https://img.shields.io/github/actions/workflow/status/dawitlabs/capsule/ci.yml?color=000&labelColor=111&label=ci&style=flat-square)](https://github.com/dawitlabs/capsule/actions)

</div>

---

MCP gives agents tools. Skills give agents procedures. Capsules give agents compact project context.

Large repositories make coding agents burn tokens rediscovering the same files, decisions, conventions, and setup details over and over. Capsule targets a **50–70% reduction in repeated repository-discovery context** for large, multi-session agent work.

## Install

**No install required — run directly with npx (always gets the latest version):**

```bash
npx capsulectx init
```

**Or install globally with your package manager:**

```bash
# npm
npm install -g capsulectx

# pnpm
pnpm add -g capsulectx

# yarn
yarn global add capsulectx

# bun
bun add -g capsulectx
```

**Keep it up to date:**

```bash
npm install -g capsulectx --prefer-online
```

> **Tip:** `npx` is the easiest option — it always runs the latest published version with no manual update step.

## Quickstart

```bash
npx capsulectx init
```

Capsule scans your repo, optionally enriches capsules with AI (using your installed Claude CLI, API keys, or a generated prompt for any browser-based AI), and creates:

```
.capsules/
  index.md
  architecture.md
  setup.md
  api.md
  data.md
  ui.md
  testing.md
  deployment.md
```

Each capsule is a Markdown file with source fingerprints in JSON frontmatter:

```md
---json
{
  "name": "api",
  "sources": ["src/api/**"],
  "fingerprints": { "src/api/users.ts": "sha256:..." },
  "updated_at": "2026-06-20T14:00:00.000Z"
}
---

# API Capsule

## Purpose

Request handlers, routes, controllers, and service boundaries.

## Key Files

- `src/api/users.ts`: source file matched by this capsule.

## Decisions

- Record stable decisions here so future agents do not rediscover them.
```

Agents read `.capsules/index.md`, choose the relevant capsule, check staleness, then inspect only the source files that actually matter.

## Commands

| Command | What it does |
|---|---|
| `capsule init` | Scan repo, run AI enrichment (optional), write all capsules |
| `capsule enrich` | Re-run AI enrichment on existing capsules |
| `capsule apply` | Apply AI-generated JSON to capsule Conventions and Decisions |
| `capsule write <name>` | Refresh one capsule from source (preserves your edits) |
| `capsule get <name>` | Print one capsule to stdout |
| `capsule scan` | Print detected source groups without writing |
| `capsule stale [name]` | Check which source files changed since last write |
| `capsule estimate <name>` | Show estimated token savings for one capsule |

## Seeing the savings

```
$ capsule estimate architecture

Capsule: architecture

Without Capsule:
  files: 5
  estimated tokens: 9,607

With Capsule:
  capsule plus stale files: 1
  stale source files: 0
  estimated tokens: 417

Estimated discovery savings: 96%
```

The estimator is directional — it uses 4 characters per token as a conservative approximation.

## Agent Workflow

Add this to `AGENTS.md`, `CLAUDE.md`, Cursor rules, or your agent instructions:

```md
Before working in this repo:

1. Read `.capsules/index.md` if it exists.
2. Read the capsule matching the task area.
3. Run `capsule stale <name>` when the CLI is available.
4. If stale, inspect changed source files before editing.
5. Update capsules when durable project knowledge changes.
```

Works with any agent that can read files — Claude Code, Codex, Cursor, Windsurf, Devin, custom MCP agents.

## Custom Groups

Capsule detects standard layouts out of the box. For non-standard structure, add `.capsules/config.json`:

```json
{
  "groups": [
    {
      "name": "workers",
      "description": "Background jobs, queues, and scheduled tasks.",
      "sources": ["src/workers/**", "src/jobs/**"]
    }
  ],
  "ignore": ["legacy/**"]
}
```

A `groups` entry with the same `name` as a default group overrides it. New names are appended. `ignore` patterns extend the default ignore list.

## Building the Demo

The animation in this README is a generated GIF — no screen-recording tools required.

```bash
npm run demo
```

Requires `rsvg-convert` (`librsvg` / `librsvg2-tools`) and `ffmpeg`. The script outputs `docs/demo.gif` from SVG frames rendered at 2× for retina. See [`scripts/build-demo.mjs`](scripts/build-demo.mjs).

## Status

Capsule is early but functional. Current capabilities:

- Language-agnostic repo scanning with monorepo support (Turborepo, pnpm workspaces)
- Static analysis: framework detection, table/model extraction, route detection, env vars
- AI enrichment on init — launches your installed Claude CLI, calls Claude/OpenAI API, or generates a prompt for any browser-based AI (Claude.ai, ChatGPT, Cursor, Windsurf)
- Write-safe re-generation: human edits to Conventions and Decisions are preserved on refresh
- Stale detection and token savings estimation
- Custom group config via `.capsules/config.json`
- Auto-patches `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.windsurfrules` with capsule instructions

**Roadmap:**
- `capsule enrich` — re-enrich existing capsules without re-initialising
- smarter `write` that diffs source changes and suggests targeted updates
- GitHub Action for stale capsule checks in CI
- before/after token reports for real agent sessions
- public capsule format spec

## Install for Local Development

```bash
git clone https://github.com/dawitlabs/capsule.git
cd capsule
npm install
npm run build
node dist/cli.js init
```

## License

MIT
