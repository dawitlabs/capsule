import type { ExtractedContent } from "./capsule-content.js";
import type { SourceGroup } from "./types.js";

export function renderBanner(version: string): string {
  return [
    "",
    "   ___  __ _ _ __  ___ _   _| | ___ ",
    "  / __/ _` | '_ \\/ __| | | | |/ _ \\",
    " | (_| (_| | |_) \\__ \\ |_| | |  __/",
    "  \\___\\__,_| .__/|___/\\__,_|_|\\___| ",
    "           |_|                        ",
    `                              v${version}`,
    "",
  ].join("\n");
}

export function renderCapsuleBody(group: SourceGroup, content?: ExtractedContent): string {
  const title = capitalize(group.name);

  const keyFilesSection = content?.keyFiles?.length
    ? content.keyFiles.join("\n")
    : group.files.length
      ? group.files.map((f) => `- \`${f}\``).join("\n")
      : "- No files matched yet.";

  const conventionsSection = content?.conventions?.length
    ? content.conventions.join("\n")
    : "- Add durable coding conventions here as you discover them.";

  const decisionsSection = content?.decisions?.length
    ? content.decisions.join("\n")
    : "- Add architectural decisions here so agents don't rediscover them.";

  return `# ${title} Capsule

## Purpose

${group.description}

## Key Files

${keyFilesSection}

## Conventions

${conventionsSection}

## Decisions

${decisionsSection}

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
