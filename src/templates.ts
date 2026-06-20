import type { SourceGroup } from "./types.js";

export function renderCapsuleBody(group: SourceGroup): string {
  const title = capitalize(group.name);
  const keyFiles = group.files.length
    ? group.files.map((file) => `- \`${file}\`: source file matched by this capsule.`).join("\n")
    : "- No files matched yet.";

  return `# ${title} Capsule

## Purpose

${group.description}

## Key Files

${keyFiles}

## Conventions

- Keep this section updated when durable project conventions are discovered.

## Decisions

- Record stable decisions here so future agents do not rediscover them.

## Agent Hints

- Read this capsule before changing files matched by its sources.
- If this capsule is stale, inspect the changed files before editing.
- Treat this capsule as a source-linked map, not a replacement for source code.
`;
}

export function renderIndex(groups: SourceGroup[]): string {
  const entries = groups.length
    ? groups.map((group) => `- \`${group.name}\`: ${group.description}`).join("\n")
    : "- No capsule groups were detected yet.";

  return `# Capsule Index

Capsules are compact, source-linked context packs for coding agents.

Agents should read this index first, then load the capsule matching the task area.

## Capsules

${entries}

## Agent Workflow

1. Read this index.
2. Choose the relevant capsule.
3. Run \`capsule stale <name>\` when the CLI is available.
4. If stale, inspect the changed source files.
5. Update capsules when durable architecture, setup, API, data, UI, testing, or deployment knowledge changes.
`;
}

function capitalize(value: string): string {
  if (value === "api" || value === "ui") {
    return value.toUpperCase();
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
