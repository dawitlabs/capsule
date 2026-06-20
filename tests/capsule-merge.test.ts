import { describe, expect, it } from "vitest";
import { mergeCapsuleBody, splitSections } from "../src/capsule-merge.js";

const FRESH_BODY = `# API Capsule

## Purpose

Request handlers, routes, controllers, and service boundaries.

## Key Files

- \`src/api/users.ts\`: source file matched by this capsule.
- \`src/api/posts.ts\`: source file matched by this capsule.

## Conventions

- Keep this section updated when durable project conventions are discovered.

## Decisions

- Record stable decisions here so future agents do not rediscover them.

## Agent Hints

- Read this capsule before changing files matched by its sources.
- If this capsule is stale, inspect the changed files before editing.
- Treat this capsule as a source-linked map, not a replacement for source code.
`;

const HUMAN_EDITED_BODY = `# API Capsule

## Purpose

Request handlers, routes, controllers, and service boundaries.

## Key Files

- \`src/api/users.ts\`: source file matched by this capsule.

## Conventions

- All routes use zod for input validation.

## Decisions

- Use kebab-case for route path segments.
- Prefer returning 422 over 400 for validation errors.

## Agent Hints

- Read this capsule before changing files matched by its sources.
- If this capsule is stale, inspect the changed files before editing.
- Treat this capsule as a source-linked map, not a replacement for source code.

## Gotchas

- The users endpoint has a custom rate limiter middleware not visible in the route file.
`;

describe("splitSections", () => {
  it("parses sections keyed by heading", () => {
    const sections = splitSections(FRESH_BODY);
    expect(sections.has("## Purpose")).toBe(true);
    expect(sections.has("## Key Files")).toBe(true);
    expect(sections.has("## Decisions")).toBe(true);
    expect(sections.has("## Agent Hints")).toBe(true);
  });

  it("stores the preamble title under empty-string key", () => {
    const sections = splitSections(FRESH_BODY);
    expect(sections.get("")).toContain("# API Capsule");
  });

  it("round-trips: section text contains the heading line", () => {
    const sections = splitSections(FRESH_BODY);
    expect(sections.get("## Key Files")).toContain("## Key Files");
  });
});

describe("mergeCapsuleBody", () => {
  it("takes machine-owned sections from fresh", () => {
    const merged = mergeCapsuleBody(FRESH_BODY, HUMAN_EDITED_BODY);
    // Fresh Key Files has posts.ts; human-edited does not
    expect(merged).toContain("src/api/posts.ts");
  });

  it("preserves human-authored Decisions", () => {
    const merged = mergeCapsuleBody(FRESH_BODY, HUMAN_EDITED_BODY);
    expect(merged).toContain("Use kebab-case for route path segments.");
    expect(merged).toContain("Prefer returning 422 over 400 for validation errors.");
  });

  it("preserves human-authored Conventions", () => {
    const merged = mergeCapsuleBody(FRESH_BODY, HUMAN_EDITED_BODY);
    expect(merged).toContain("All routes use zod for input validation.");
  });

  it("appends custom human-only sections not in fresh template", () => {
    const merged = mergeCapsuleBody(FRESH_BODY, HUMAN_EDITED_BODY);
    expect(merged).toContain("## Gotchas");
    expect(merged).toContain("custom rate limiter middleware");
  });

  it("uses fresh Purpose (machine-owned) even if existing differs", () => {
    const modifiedExisting = HUMAN_EDITED_BODY.replace(
      "Request handlers, routes, controllers, and service boundaries.",
      "Old stale description.",
    );
    const merged = mergeCapsuleBody(FRESH_BODY, modifiedExisting);
    expect(merged).toContain("Request handlers, routes, controllers, and service boundaries.");
    expect(merged).not.toContain("Old stale description.");
  });

  it("writes fresh template verbatim when no existing capsule content", () => {
    const merged = mergeCapsuleBody(FRESH_BODY, "");
    expect(merged.trim()).toBe(FRESH_BODY.trim());
  });
});
