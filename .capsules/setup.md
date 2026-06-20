---
name: setup
description: 'Local setup, scripts, dependencies, and runtime configuration.'
sources:
  - package.json
  - package-lock.json
  - pnpm-workspace.yaml
  - yarn.lock
  - docker-compose.yml
  - Dockerfile
  - .env.example
fingerprints:
  package-lock.json: 'sha256:acad903a10bd70e5f936e27a814f049b2ac966c75d12d9a78cd5911753ba835c'
  package.json: 'sha256:63582fb60feab22c480a28ae32173a6660a9b0605dd5a29902428b9efa5b2bc8'
updated_at: '2026-06-20T13:42:12.869Z'
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
