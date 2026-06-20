---json
{
  "name": "deployment",
  "description": "Deployment, CI, hosting, containers, and production runtime config.",
  "sources": [
    ".github/**",
    "vercel.json",
    "netlify.toml",
    "fly.toml",
    "Dockerfile",
    "docker-compose.yml"
  ],
  "fingerprints": {
    ".github/workflows/ci.yml": "sha256:234816433b578eb5413a2592a5b6f2f46ea121c4147a5ba43c144ca0b04b2e7b"
  },
  "updated_at": "2026-06-20T13:51:14.811Z"
}
---
# Deployment Capsule

## Purpose

Deployment, CI, hosting, containers, and production runtime config.

## Key Files

- `.github/workflows/ci.yml`: source file matched by this capsule.

## Conventions

- Keep this section updated when durable project conventions are discovered.

## Decisions

- Record stable decisions here so future agents do not rediscover them.

## Agent Hints

- Read this capsule before changing files matched by its sources.
- If this capsule is stale, inspect the changed files before editing.
- Treat this capsule as a source-linked map, not a replacement for source code.
