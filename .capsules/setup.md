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
    "package-lock.json": "sha256:af2d3413fb5f9ab82bd00b3347363402b5d30b5b9249eea9f60d2062e40e9fc8",
    "package.json": "sha256:57b54443aa29088e5b40738b791d8cbdccdd11b8b58cf887c492b34461611d75"
  },
  "updated_at": "2026-06-20T13:52:41.036Z"
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
