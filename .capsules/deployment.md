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
    ".github/workflows/ci.yml": "sha256:aff2fe68cbf11c9b907a3fe5c8a824d6ca0a56209e058b3fbdfc812810945a95"
  },
  "updated_at": "2026-06-20T14:09:27.860Z"
}
---
# Deployment Capsule

## Purpose

Deployment, CI, hosting, containers, and production runtime config.

## Key Files

- `.github/workflows/ci.yml`: source module.

## Conventions

- Keep this section updated when durable project conventions are discovered.

## Decisions

- Record stable decisions here so future agents do not rediscover them.

## Agent Hints

- Read this capsule before changing files matched by its sources.
- If this capsule is stale, inspect the changed files before editing.
- Treat this capsule as a source-linked map, not a replacement for source code.
