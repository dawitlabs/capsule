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
    "package-lock.json": "sha256:113b85cff7877f10a86b03f6222c2713565f5d86b0f163f8d5bb5eaf6f93e487",
    "package.json": "sha256:1ec5ebdd4d70ad47dd53181beeb3e832a90c92fea06630ed6bcc7620e24a2851"
  },
  "updated_at": "2026-06-20T13:59:24.369Z"
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
