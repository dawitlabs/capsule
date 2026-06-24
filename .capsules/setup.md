---json
{
  "name": "setup",
  "description": "Local setup, scripts, dependencies, and runtime configuration.",
  "sources": [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "bun.lockb",
    "yarn.lock",
    "docker-compose.yml",
    "Dockerfile",
    ".env.example",
    ".env.local.example"
  ],
  "fingerprints": {
    "package-lock.json": "sha256:689069842e16674c541fdb5666869aca19ffba5d6211ea1fb8c7326db7a47721",
    "package.json": "sha256:4fda84d870adcd5ad25d3216b11b10e129e69a71ce38d68abddeb250b7d60f81"
  },
  "updated_at": "2026-06-24T11:04:35.189Z"
}
---
# Setup Capsule

## Purpose

Local setup, scripts, dependencies, and runtime configuration.

## Key Files

- `package-lock.json`: source module.
- `package.json`: Markdown context packs that help coding agents reduce repeated repository-discovery tokens. | node >=20, ESM | bin: capsule, capsulectx | deps: commander, fast-glob, js-tiktoken | scripts: build (tsc), demo (node), dev (tsx), format (biome), lint (biome).

## Conventions

- Keep this section updated when durable project conventions are discovered.

## Decisions

- Record stable decisions here so future agents do not rediscover them.

## Agent Hints

- Read this capsule before changing files matched by its sources.
- If this capsule is stale, inspect the changed files before editing.
- Treat this capsule as a source-linked map, not a replacement for source code.
