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
    "package.json": "sha256:b0563da9be4ace6f4d22fcd75fd558427f4096f0ae3a1052f374ef97e7f33d56"
  },
  "updated_at": "2026-06-20T14:09:21.217Z"
}
---
# Setup Capsule

## Purpose

Local setup, scripts, dependencies, and runtime configuration.

## Key Files

- `package-lock.json`: source file matched by this capsule.
- `package.json`: source file matched by this capsule.

## Conventions

- Keep this section updated when durable project conventions are discovered.

## Decisions

- Record stable decisions here so future agents do not rediscover them.

## Agent Hints

- Read this capsule before changing files matched by its sources.
- If this capsule is stale, inspect the changed files before editing.
- Treat this capsule as a source-linked map, not a replacement for source code.
