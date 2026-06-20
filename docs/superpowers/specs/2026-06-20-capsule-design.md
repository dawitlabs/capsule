# Capsule v0 Design

## Product Thesis

Capsule is a language-agnostic context layer for coding agents.

Large repositories waste agent tokens because each agent repeatedly scans the same files, chat history, conventions, and prior decisions. Capsule turns durable project knowledge into compact Markdown context packs that agents can load before reading source files.

Capsule is not a replacement for source code. It is a verified map of the source code.

## Positioning

MCP gives agents tools.

Skills give agents procedures.

Capsules give agents compact project context.

The first public promise is:

> Build source-linked Markdown context packs for any repository, so agents use fewer tokens and make fewer wrong assumptions.

The measurable product target is:

> Reduce repeated repository-discovery context by 50-70% on large, multi-session agent tasks.

This target applies to discovery context, not every token an agent spends. Capsule should reduce repeated scanning, orientation, and handoff overhead. It does not reduce the tokens needed to read the exact source code being edited.

## Target User

The first user is a developer who uses coding agents on medium or large projects and keeps paying the cost of repeated context discovery.

They want:

- less token waste
- faster agent onboarding
- better handoff between agents
- fewer stale assumptions
- human-readable context stored in Git

## v0 Scope

Capsule v0 is a CLI that runs inside any repository.

Commands:

```bash
capsule init
capsule scan
capsule write <name>
capsule get <name>
capsule stale
capsule estimate <name>
```

The CLI creates a `.capsules/` directory:

```txt
.capsules/
  index.md
  architecture.md
  setup.md
  data.md
  api.md
  ui.md
  testing.md
```

The first implementation is hybrid:

- The CLI discovers repo structure and source file groups.
- The CLI writes useful starter capsules.
- Humans and agents can edit capsules.
- The CLI tracks source fingerprints and reports stale capsules.

## File Format

Capsules are Markdown files with frontmatter.

```md
---
name: api
description: Request handlers, routes, and public service boundaries.
sources:
  - src/api/**
  - routes/**
  - openapi.yaml
fingerprints:
  src/api/users.ts: sha256:example
updated_at: 2026-06-20T00:00:00Z
---

# API Capsule

## Purpose

Short explanation of what this area owns.

## Key Files

- `src/api/users.ts`: user endpoint handlers

## Conventions

- Validate input before business logic.
- Keep route handlers thin when possible.

## Agent Hints

Read this capsule before changing endpoints. If behavior is unclear, inspect the source files listed above.
```

Frontmatter fields:

- `name`: stable capsule id
- `description`: one-line purpose
- `sources`: globs or exact paths used by the capsule
- `fingerprints`: source file fingerprints known when the capsule was written
- `updated_at`: ISO timestamp

## Source Discovery

Capsule must work for any framework or language. v0 uses universal repo signals:

- top-level directories
- README and docs files
- package manifests
- build/config files
- test directories
- route-like directories
- database/schema/migration filenames
- file counts and extensions

The scanner should avoid deep language-specific parsing in v0. It may classify common areas:

- `architecture`
- `setup`
- `api`
- `data`
- `ui`
- `testing`
- `deployment`

If classification is uncertain, the scanner should create `architecture.md` and `setup.md` only, then list suggested capsules in `.capsules/index.md`.

## Staleness

Capsule detects staleness by hashing files matched by each capsule's `sources`.

`capsule stale` prints:

```txt
STALE api
  changed: src/api/users.ts
  missing: routes/legacy.ts

FRESH setup
```

Stale means the capsule may still be useful, but the agent should inspect changed source files before trusting it.

## Agent Usage

Agents should load `.capsules/index.md` first.

Then they should load the capsule matching the task area. Example:

```bash
capsule get api
```

If the capsule is stale, the agent should read the changed source files before editing.

## Token Savings Model

Capsule should make savings visible with `capsule estimate <name>`.

The first estimate is intentionally simple:

- Estimate uncapsuled discovery as the token cost of all files matched by the capsule's `sources`.
- Estimate capsuled discovery as the token cost of the capsule Markdown plus changed or stale source files.
- Report percentage savings.

Example:

```txt
Capsule: api

Without Capsule:
  files: 38
  estimated tokens: 82,000

With Capsule:
  capsule tokens: 4,200
  stale source tokens: 19,000
  estimated tokens: 23,200

Estimated discovery savings: 71%
```

The estimator is a directional metric, not a billing-accurate tokenizer. v0 may use a conservative approximation of 4 characters per token.

## Non-Goals For v0

Capsule v0 does not:

- call paid LLM APIs
- promise perfect summaries
- replace tests
- replace source inspection
- enforce policies or permissions
- become a hosted product
- require a specific framework or language

## Architecture

The CLI has four internal modules:

- `repo-scan`: discovers files and classifies source groups
- `capsule-format`: reads and writes Markdown with frontmatter
- `fingerprint`: hashes source files and compares staleness
- `commands`: implements CLI commands

The first implementation should be a Node.js TypeScript CLI because it fits npm distribution and common agent/dev workflows.

## Testing

Core tests:

- initializes `.capsules/`
- scans a fixture repository
- writes valid capsule Markdown
- reads capsule frontmatter
- detects fresh capsules
- detects stale capsules after source changes
- ignores common heavy directories like `node_modules`, `.git`, `dist`, `build`

## Open Questions

- Package name: `capsule`, `context-capsule`, or `capsulectx`
- Whether generated capsules should include source snippets in v0
- Whether to add a `capsule prompt` command that prints agent instructions

## First Build Recommendation

Start with the CLI and no hosted service.

The wedge is a Git-friendly `.capsules/` standard that any agent can consume. If developers adopt the folder format, hosted sync, team dashboards, and agent integrations can come later.
