---json
{
  "name": "architecture",
  "description": "Repository structure, docs, and high-level project shape.",
  "sources": [
    "README*",
    "docs/**",
    "package.json",
    "pyproject.toml",
    "go.mod",
    "Cargo.toml"
  ],
  "fingerprints": {
    "README.md": "sha256:f9b86d4e6878bfc5f0a027ae464043aaf33d5b7adb2f27a7429735d9aa871aaf",
    "docs/agent-snippets.md": "sha256:16b45fcca359eb612d65dafd426ee6e05794782e559cfa4668611294835419e4",
    "docs/superpowers/plans/2026-06-20-capsule-cli-v0.md": "sha256:9a0343f6bf80a3e44117a3770f4852a845a040818819ea6e89f09a8e692954a1",
    "docs/superpowers/specs/2026-06-20-capsule-design.md": "sha256:a53988525026dc9d7e0f696dd8ed48ac30a2f82d366174cbf2c11f49f973ac92",
    "package.json": "sha256:57b54443aa29088e5b40738b791d8cbdccdd11b8b58cf887c492b34461611d75"
  },
  "updated_at": "2026-06-20T13:52:40.997Z"
}
---
# Architecture Capsule

## Purpose

Repository structure, docs, and high-level project shape.

## Key Files

- `README.md`: source file matched by this capsule.
- `docs/agent-snippets.md`: source file matched by this capsule.
- `docs/superpowers/plans/2026-06-20-capsule-cli-v0.md`: source file matched by this capsule.
- `docs/superpowers/specs/2026-06-20-capsule-design.md`: source file matched by this capsule.
- `package.json`: source file matched by this capsule.

## Conventions

- Keep this section updated when durable project conventions are discovered.

## Decisions

- Record stable decisions here so future agents do not rediscover them.

## Agent Hints

- Read this capsule before changing files matched by its sources.
- If this capsule is stale, inspect the changed files before editing.
- Treat this capsule as a source-linked map, not a replacement for source code.
