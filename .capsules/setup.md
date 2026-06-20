---json
{
  "name": "setup",
  "description": "Local setup, scripts, dependencies, and runtime configuration.",
  "sources": [
    "package.json",
    "package-lock.json",
    "pnpm-workspace.yaml",
    "yarn.lock",
    "docker-compose.yml",
    "Dockerfile",
    ".env.example"
  ],
  "fingerprints": {
    "package-lock.json": "sha256:2c7a5ccd781e4474f467fed4f67d37c000f99de310b2e49d8655931fe7ddf712",
    "package.json": "sha256:c007314a370b68165ee174b31dd4e6f1917d5dedbe7cddaa6296e05f8677b700"
  },
  "updated_at": "2026-06-20T15:09:15.602Z"
}
---
# Setup Capsule

## Purpose

Local setup, scripts, dependencies, and runtime configuration.

## Key Files

- `package-lock.json`: source module.
- `package.json`: project manifest — Markdown context packs that help coding agents reduce repeated repository-discovery tokens..

## Conventions

- Keep this section updated when durable project conventions are discovered.

## Decisions

- Record stable decisions here so future agents do not rediscover them.

## Agent Hints

- Read this capsule before changing files matched by its sources.
- If this capsule is stale, inspect the changed files before editing.
- Treat this capsule as a source-linked map, not a replacement for source code.
