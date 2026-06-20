# Capsule

Capsule creates compact, source-linked Markdown context packs for coding agents.

MCP gives agents tools. Skills give agents procedures. Capsules give agents compact project context.

## Why Capsule Exists

Large repositories make coding agents burn tokens rediscovering the same files, decisions, conventions, and setup details over and over.

Capsule targets a **50-70% reduction in repeated repository-discovery context** for large, multi-session agent work.

That does not mean every task costs 70% fewer tokens. It means agents should spend far less context on repeated orientation and more context on the source files that actually matter.

## How It Works

Run Capsule in a repository:

```bash
npx capsulectx init
```

Capsule creates:

```txt
.capsules/
  index.md
  architecture.md
  setup.md
  api.md
  data.md
  ui.md
  testing.md
```

Each capsule is Markdown with source fingerprints:

```md
---
name: api
sources:
  - src/api/**
fingerprints:
  src/api/users.ts: sha256:...
---

# API Capsule

## Purpose

Request handlers, routes, controllers, and service boundaries.

## Key Files

- `src/api/users.ts`

## Decisions

- Record stable decisions here so future agents do not rediscover them.
```

Agents read `.capsules/index.md`, choose the relevant capsule, check staleness, then inspect only the source files that matter.

## Commands

```bash
capsule init
capsule scan
capsule write api
capsule get api
capsule stale api
capsule estimate api
```

`capsule estimate` makes the value visible:

```txt
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

The estimator is directional. It uses a conservative approximation of 4 characters per token.

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

Capsule is designed to work with any coding agent that can read files:

- Codex
- Claude Code
- Cursor
- Windsurf
- Devin-style agents
- custom MCP agents
- terminal agents

## Install For Local Development

```bash
git clone https://github.com/Dawaman43/capsule.git
cd capsule
npm install
npm run build
node dist/cli.js init
```

## Status

Capsule is early.

Current v0:

- local-only CLI
- language-agnostic repo scanning
- Markdown context packs
- source fingerprints
- stale detection
- token savings estimation

Not in v0:

- paid LLM calls
- hosted dashboard
- perfect summaries
- source-code replacement
- policy enforcement

## Roadmap

- `capsule prompt claude|codex|cursor`
- smarter update behavior that preserves human-written decisions
- better source grouping for monorepos
- before/after token reports for real agent sessions
- GitHub Action for stale capsule checks
- public capsule format spec

## License

MIT
