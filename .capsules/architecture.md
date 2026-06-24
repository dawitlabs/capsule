---json
{
  "name": "architecture",
  "description": "Repository structure, docs, and high-level project shape.",
  "sources": [
    "README*",
    "docs/**",
    "package.json",
    "turbo.json",
    "pyproject.toml",
    "go.mod",
    "Cargo.toml"
  ],
  "fingerprints": {
    "README.md": "sha256:70d439eccb477482993f4b4fe547fce44d7f7faad650e08bc4929a5b196f0d88",
    "docs/agent-snippets.md": "sha256:16b45fcca359eb612d65dafd426ee6e05794782e559cfa4668611294835419e4",
    "docs/superpowers/plans/2026-06-20-capsule-cli-v0.md": "sha256:9a0343f6bf80a3e44117a3770f4852a845a040818819ea6e89f09a8e692954a1",
    "docs/superpowers/specs/2026-06-20-capsule-design.md": "sha256:a53988525026dc9d7e0f696dd8ed48ac30a2f82d366174cbf2c11f49f973ac92",
    "package.json": "sha256:4fda84d870adcd5ad25d3216b11b10e129e69a71ce38d68abddeb250b7d60f81"
  },
  "updated_at": "2026-06-24T11:04:34.887Z"
}
---
# Architecture Capsule

## Purpose

Repository structure, docs, and high-level project shape.

## Key Files

- `README.md`: project documentation — <div align="center">.
- `docs/agent-snippets.md`: source module.
- `docs/superpowers/plans/2026-06-20-capsule-cli-v0.md`: exports `listRepositoryFiles`, `CapsuleName`, `CapsuleFrontmatter`, `CapsuleFile`, `SourceGroup`.
- `docs/superpowers/specs/2026-06-20-capsule-design.md`: source module.
- `package.json`: Markdown context packs that help coding agents reduce repeated repository-discovery tokens. | node >=20, ESM | bin: capsule, capsulectx | deps: commander, fast-glob, js-tiktoken | scripts: build (tsc), demo (node), dev (tsx), format (biome), lint (biome).

## Conventions

- Keep this section updated when durable project conventions are discovered.

## Decisions

- Record stable decisions here so future agents do not rediscover them.

## Agent Hints

- Read this capsule before changing files matched by its sources.
- If this capsule is stale, inspect the changed files before editing.
- Treat this capsule as a source-linked map, not a replacement for source code.
