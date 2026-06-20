# Capsule CLI v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a language-agnostic CLI that creates `.capsules/` Markdown context packs, tracks source staleness, and estimates repeated-discovery token savings.

**Architecture:** Implement a small TypeScript Node CLI with focused modules for repo scanning, Markdown capsule format, fingerprints, token estimation, and commands. Keep v0 deterministic and local-only: no hosted service, no paid LLM calls, and no framework-specific parser.

**Tech Stack:** Node.js, TypeScript, Vitest, `tsx`, `commander`, `gray-matter`, `fast-glob`.

---

## File Structure

- Create `package.json`: npm scripts, CLI bin, dependencies.
- Create `tsconfig.json`: TypeScript config for Node CLI.
- Create `vitest.config.ts`: test configuration.
- Create `src/cli.ts`: command routing and terminal output.
- Create `src/repo-scan.ts`: ignore-aware file discovery and capsule area classification.
- Create `src/capsule-format.ts`: read/write Markdown capsules with frontmatter.
- Create `src/fingerprint.ts`: hash source files and compare current fingerprints.
- Create `src/estimate.ts`: approximate token counts and savings percentages.
- Create `src/templates.ts`: starter capsule and index Markdown generation.
- Create `src/types.ts`: shared types.
- Create `tests/fixtures/sample-repo/`: small fake repository.
- Create `tests/*.test.ts`: focused unit and command-level tests.
- Modify `docs/superpowers/specs/2026-06-20-capsule-design.md`: already updated with 50-70% discovery savings target.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/types.ts`

- [ ] **Step 1: Create package metadata**

Create `package.json`:

```json
{
  "name": "capsule",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "bin": {
    "capsule": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "fast-glob": "^3.3.2",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "vitest.config.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 3: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create shared types**

Create `src/types.ts`:

```ts
export type CapsuleName =
  | "architecture"
  | "setup"
  | "api"
  | "data"
  | "ui"
  | "testing"
  | "deployment"
  | string;

export interface CapsuleFrontmatter {
  name: CapsuleName;
  description: string;
  sources: string[];
  fingerprints: Record<string, string>;
  updated_at: string;
}

export interface CapsuleFile {
  frontmatter: CapsuleFrontmatter;
  body: string;
  path: string;
}

export interface SourceGroup {
  name: CapsuleName;
  description: string;
  sources: string[];
  files: string[];
}

export interface StaleResult {
  name: CapsuleName;
  fresh: boolean;
  changed: string[];
  missing: string[];
  added: string[];
}
```

- [ ] **Step 5: Install dependencies**

Run:

```bash
npm install
```

Expected: `node_modules/` and `package-lock.json` are created.

- [ ] **Step 6: Verify scaffold**

Run:

```bash
npm run typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 7: Commit scaffold**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src/types.ts
git commit -m "chore: scaffold capsule cli"
```

## Task 2: Repo Scanner

**Files:**
- Create: `src/repo-scan.ts`
- Create: `tests/repo-scan.test.ts`
- Create fixture files under `tests/fixtures/sample-repo/`

- [ ] **Step 1: Create sample repo fixture**

Create:

```txt
tests/fixtures/sample-repo/README.md
tests/fixtures/sample-repo/package.json
tests/fixtures/sample-repo/src/api/users.ts
tests/fixtures/sample-repo/src/db/schema.ts
tests/fixtures/sample-repo/src/components/button.tsx
tests/fixtures/sample-repo/tests/users.test.ts
tests/fixtures/sample-repo/node_modules/ignored.js
```

Use small one-line contents in each file.

- [ ] **Step 2: Write scanner test**

Create `tests/repo-scan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/repo-scan.js";

describe("scanRepository", () => {
  it("discovers source groups and ignores heavy directories", async () => {
    const groups = await scanRepository("tests/fixtures/sample-repo");

    const api = groups.find((group) => group.name === "api");
    const data = groups.find((group) => group.name === "data");
    const ui = groups.find((group) => group.name === "ui");
    const testing = groups.find((group) => group.name === "testing");

    expect(api?.files).toContain("src/api/users.ts");
    expect(data?.files).toContain("src/db/schema.ts");
    expect(ui?.files).toContain("src/components/button.tsx");
    expect(testing?.files).toContain("tests/users.test.ts");
    expect(groups.flatMap((group) => group.files)).not.toContain("node_modules/ignored.js");
  });
});
```

- [ ] **Step 3: Run test and verify failure**

Run:

```bash
npm test -- tests/repo-scan.test.ts
```

Expected: FAIL because `src/repo-scan.ts` does not exist.

- [ ] **Step 4: Implement scanner**

Create `src/repo-scan.ts`:

```ts
import fg from "fast-glob";
import type { SourceGroup } from "./types.js";

const IGNORE = [
  ".git/**",
  ".capsules/**",
  "node_modules/**",
  "dist/**",
  "build/**",
  ".next/**",
  "coverage/**",
  ".turbo/**",
  "target/**",
  "vendor/**",
];

const GROUPS: Array<Omit<SourceGroup, "files">> = [
  {
    name: "architecture",
    description: "Repository structure, docs, and high-level project shape.",
    sources: ["README*", "docs/**", "package.json", "pyproject.toml", "go.mod", "Cargo.toml"],
  },
  {
    name: "setup",
    description: "Local setup, scripts, dependencies, and runtime configuration.",
    sources: ["package.json", "pnpm-workspace.yaml", "docker-compose.yml", "Dockerfile", ".env.example"],
  },
  {
    name: "api",
    description: "Request handlers, routes, controllers, and service boundaries.",
    sources: ["src/api/**", "app/api/**", "routes/**", "controllers/**", "server/**"],
  },
  {
    name: "data",
    description: "Database schemas, migrations, models, repositories, and persistence.",
    sources: ["src/db/**", "db/**", "database/**", "migrations/**", "prisma/**", "drizzle/**", "models/**"],
  },
  {
    name: "ui",
    description: "User interface components, pages, screens, and styles.",
    sources: ["src/components/**", "components/**", "src/pages/**", "pages/**", "app/**", "src/app/**"],
  },
  {
    name: "testing",
    description: "Automated tests, fixtures, mocks, and quality gates.",
    sources: ["tests/**", "test/**", "__tests__/**", "e2e/**", "spec/**"],
  },
  {
    name: "deployment",
    description: "Deployment, CI, hosting, containers, and production runtime config.",
    sources: [".github/**", "vercel.json", "netlify.toml", "fly.toml", "Dockerfile", "docker-compose.yml"],
  },
];

export async function listRepositoryFiles(rootDir: string): Promise<string[]> {
  return fg(["**/*"], {
    cwd: rootDir,
    dot: true,
    onlyFiles: true,
    ignore: IGNORE,
  });
}

export async function scanRepository(rootDir: string): Promise<SourceGroup[]> {
  const files = await listRepositoryFiles(rootDir);
  const groups: SourceGroup[] = [];

  for (const group of GROUPS) {
    const matched = await fg(group.sources, {
      cwd: rootDir,
      dot: true,
      onlyFiles: true,
      ignore: IGNORE,
    });

    groups.push({
      ...group,
      files: matched.filter((file) => files.includes(file)).sort(),
    });
  }

  return groups.filter((group) => group.files.length > 0);
}
```

- [ ] **Step 5: Run scanner test**

Run:

```bash
npm test -- tests/repo-scan.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit scanner**

```bash
git add src/repo-scan.ts tests/repo-scan.test.ts tests/fixtures/sample-repo
git commit -m "feat: scan repositories into capsule groups"
```

## Task 3: Capsule Markdown Format

**Files:**
- Create: `src/capsule-format.ts`
- Create: `src/templates.ts`
- Create: `tests/capsule-format.test.ts`

- [ ] **Step 1: Write format test**

Create `tests/capsule-format.test.ts`:

```ts
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readCapsule, writeCapsule } from "../src/capsule-format.js";
import { renderCapsuleBody } from "../src/templates.js";

describe("capsule format", () => {
  it("writes and reads markdown capsules with frontmatter", async () => {
    const root = "tests/.tmp/capsule-format";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, ".capsules"), { recursive: true });

    await writeCapsule(root, {
      frontmatter: {
        name: "api",
        description: "Request handlers.",
        sources: ["src/api/**"],
        fingerprints: { "src/api/users.ts": "sha256:abc" },
        updated_at: "2026-06-20T00:00:00.000Z",
      },
      body: renderCapsuleBody({
        name: "api",
        description: "Request handlers.",
        sources: ["src/api/**"],
        files: ["src/api/users.ts"],
      }),
      path: ".capsules/api.md",
    });

    const capsule = await readCapsule(root, "api");

    expect(capsule.frontmatter.name).toBe("api");
    expect(capsule.frontmatter.sources).toEqual(["src/api/**"]);
    expect(capsule.body).toContain("# API Capsule");
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm test -- tests/capsule-format.test.ts
```

Expected: FAIL because format modules do not exist.

- [ ] **Step 3: Implement templates**

Create `src/templates.ts`:

```ts
import type { SourceGroup } from "./types.js";

export function renderCapsuleBody(group: SourceGroup): string {
  const title = capitalize(group.name);
  const keyFiles = group.files.length
    ? group.files.map((file) => `- \`${file}\``).join("\n")
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
- Do not treat this capsule as a replacement for source code.
`;
}

export function renderIndex(groups: SourceGroup[]): string {
  const entries = groups
    .map((group) => `- \`${group.name}\`: ${group.description}`)
    .join("\n");

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
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

- [ ] **Step 4: Implement capsule format**

Create `src/capsule-format.ts`:

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import type { CapsuleFile, CapsuleFrontmatter, CapsuleName } from "./types.js";

export async function writeCapsule(rootDir: string, capsule: CapsuleFile): Promise<void> {
  const target = join(rootDir, capsule.path);
  await mkdir(join(rootDir, ".capsules"), { recursive: true });

  const content = matter.stringify(capsule.body, capsule.frontmatter);
  await writeFile(target, content, "utf8");
}

export async function readCapsule(rootDir: string, name: CapsuleName): Promise<CapsuleFile> {
  const path = `.capsules/${name}.md`;
  const raw = await readFile(join(rootDir, path), "utf8");
  const parsed = matter(raw);

  return {
    frontmatter: parsed.data as CapsuleFrontmatter,
    body: parsed.content.trimStart(),
    path,
  };
}
```

- [ ] **Step 5: Run format test**

Run:

```bash
npm test -- tests/capsule-format.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit format modules**

```bash
git add src/capsule-format.ts src/templates.ts tests/capsule-format.test.ts
git commit -m "feat: read and write markdown capsules"
```

## Task 4: Fingerprints And Staleness

**Files:**
- Create: `src/fingerprint.ts`
- Create: `tests/fingerprint.test.ts`

- [ ] **Step 1: Write staleness test**

Create `tests/fingerprint.test.ts`:

```ts
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeFingerprints, compareFingerprints } from "../src/fingerprint.js";

describe("fingerprints", () => {
  it("detects changed, missing, and added source files", async () => {
    const root = "tests/.tmp/fingerprint";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, "src/api"), { recursive: true });
    await writeFile(join(root, "src/api/users.ts"), "one", "utf8");

    const first = await computeFingerprints(root, ["src/api/**"]);

    await writeFile(join(root, "src/api/users.ts"), "two", "utf8");
    await writeFile(join(root, "src/api/posts.ts"), "new", "utf8");

    const current = await computeFingerprints(root, ["src/api/**"]);
    const result = compareFingerprints("api", first, current);

    expect(result.fresh).toBe(false);
    expect(result.changed).toEqual(["src/api/users.ts"]);
    expect(result.added).toEqual(["src/api/posts.ts"]);
    expect(result.missing).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm test -- tests/fingerprint.test.ts
```

Expected: FAIL because `src/fingerprint.ts` does not exist.

- [ ] **Step 3: Implement fingerprints**

Create `src/fingerprint.ts`:

```ts
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { CapsuleName, StaleResult } from "./types.js";

const IGNORE = [".git/**", ".capsules/**", "node_modules/**", "dist/**", "build/**", ".next/**", "coverage/**"];

export async function computeFingerprints(rootDir: string, sources: string[]): Promise<Record<string, string>> {
  const files = await fg(sources, {
    cwd: rootDir,
    dot: true,
    onlyFiles: true,
    ignore: IGNORE,
  });

  const fingerprints: Record<string, string> = {};

  for (const file of files.sort()) {
    const content = await readFile(join(rootDir, file));
    fingerprints[file] = `sha256:${createHash("sha256").update(content).digest("hex")}`;
  }

  return fingerprints;
}

export function compareFingerprints(
  name: CapsuleName,
  previous: Record<string, string>,
  current: Record<string, string>,
): StaleResult {
  const previousFiles = new Set(Object.keys(previous));
  const currentFiles = new Set(Object.keys(current));

  const changed = [...previousFiles].filter((file) => currentFiles.has(file) && previous[file] !== current[file]).sort();
  const missing = [...previousFiles].filter((file) => !currentFiles.has(file)).sort();
  const added = [...currentFiles].filter((file) => !previousFiles.has(file)).sort();

  return {
    name,
    fresh: changed.length === 0 && missing.length === 0 && added.length === 0,
    changed,
    missing,
    added,
  };
}
```

- [ ] **Step 4: Run fingerprint test**

Run:

```bash
npm test -- tests/fingerprint.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit fingerprints**

```bash
git add src/fingerprint.ts tests/fingerprint.test.ts
git commit -m "feat: detect stale capsule sources"
```

## Task 5: Token Savings Estimator

**Files:**
- Create: `src/estimate.ts`
- Create: `tests/estimate.test.ts`

- [ ] **Step 1: Write estimator test**

Create `tests/estimate.test.ts`:

```ts
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { estimateCapsuleSavings } from "../src/estimate.js";

describe("estimateCapsuleSavings", () => {
  it("estimates discovery savings from source files versus capsule text", async () => {
    const root = "tests/.tmp/estimate";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, "src/api"), { recursive: true });
    await mkdir(join(root, ".capsules"), { recursive: true });

    await writeFile(join(root, "src/api/users.ts"), "a".repeat(4000), "utf8");
    await writeFile(join(root, "src/api/posts.ts"), "b".repeat(4000), "utf8");
    await writeFile(join(root, ".capsules/api.md"), "capsule".repeat(50), "utf8");

    const result = await estimateCapsuleSavings(root, {
      capsulePath: ".capsules/api.md",
      sourceFiles: ["src/api/users.ts", "src/api/posts.ts"],
      staleFiles: [],
    });

    expect(result.withoutCapsuleTokens).toBe(2000);
    expect(result.withCapsuleTokens).toBeLessThan(200);
    expect(result.savingsPercent).toBeGreaterThan(90);
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm test -- tests/estimate.test.ts
```

Expected: FAIL because `src/estimate.ts` does not exist.

- [ ] **Step 3: Implement estimator**

Create `src/estimate.ts`:

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface EstimateInput {
  capsulePath: string;
  sourceFiles: string[];
  staleFiles: string[];
}

export interface EstimateResult {
  sourceFiles: number;
  staleFiles: number;
  withoutCapsuleTokens: number;
  withCapsuleTokens: number;
  savingsPercent: number;
}

export async function estimateCapsuleSavings(rootDir: string, input: EstimateInput): Promise<EstimateResult> {
  const sourceChars = await sumChars(rootDir, input.sourceFiles);
  const capsuleChars = await sumChars(rootDir, [input.capsulePath]);
  const staleChars = await sumChars(rootDir, input.staleFiles);

  const withoutCapsuleTokens = estimateTokens(sourceChars);
  const withCapsuleTokens = estimateTokens(capsuleChars + staleChars);
  const savingsPercent =
    withoutCapsuleTokens === 0
      ? 0
      : Math.max(0, Math.round(((withoutCapsuleTokens - withCapsuleTokens) / withoutCapsuleTokens) * 100));

  return {
    sourceFiles: input.sourceFiles.length,
    staleFiles: input.staleFiles.length,
    withoutCapsuleTokens,
    withCapsuleTokens,
    savingsPercent,
  };
}

export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

async function sumChars(rootDir: string, files: string[]): Promise<number> {
  let total = 0;

  for (const file of files) {
    const content = await readFile(join(rootDir, file), "utf8");
    total += content.length;
  }

  return total;
}
```

- [ ] **Step 4: Run estimator test**

Run:

```bash
npm test -- tests/estimate.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit estimator**

```bash
git add src/estimate.ts tests/estimate.test.ts
git commit -m "feat: estimate capsule token savings"
```

## Task 6: CLI Commands

**Files:**
- Create: `src/cli.ts`
- Create: `tests/cli.test.ts`

- [ ] **Step 1: Write command smoke tests**

Create `tests/cli.test.ts`:

```ts
import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const exec = promisify(execFile);

describe("capsule cli", () => {
  it("initializes, checks stale status, and estimates savings", async () => {
    const root = "tests/.tmp/cli";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, "src/api"), { recursive: true });
    await writeFile(join(root, "README.md"), "# Sample", "utf8");
    await writeFile(join(root, "src/api/users.ts"), "export const users = [];", "utf8");

    await exec("npx", ["tsx", "../../src/cli.ts", "init"], { cwd: root });

    const stale = await exec("npx", ["tsx", "../../src/cli.ts", "stale", "api"], { cwd: root });
    expect(stale.stdout).toContain("FRESH api");

    const estimate = await exec("npx", ["tsx", "../../src/cli.ts", "estimate", "api"], { cwd: root });
    expect(estimate.stdout).toContain("Estimated discovery savings");
  });
});
```

- [ ] **Step 2: Run CLI test and verify failure**

Run:

```bash
npm test -- tests/cli.test.ts
```

Expected: FAIL because `src/cli.ts` does not exist.

- [ ] **Step 3: Implement CLI**

Create `src/cli.ts`:

```ts
#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Command } from "commander";
import { readCapsule, writeCapsule } from "./capsule-format.js";
import { estimateCapsuleSavings } from "./estimate.js";
import { compareFingerprints, computeFingerprints } from "./fingerprint.js";
import { scanRepository } from "./repo-scan.js";
import { renderCapsuleBody, renderIndex } from "./templates.js";
import type { SourceGroup } from "./types.js";

const program = new Command();

program.name("capsule").description("Markdown context packs for coding agents").version("0.0.0");

program
  .command("init")
  .description("Create .capsules starter context packs")
  .action(async () => {
    const root = process.cwd();
    const groups = await scanRepository(root);

    for (const group of groups) {
      await writeGroupCapsule(root, group);
    }

    await writeFile(join(root, ".capsules", "index.md"), renderIndex(groups), "utf8");
    console.log(`Created .capsules with ${groups.length} capsules`);
  });

program
  .command("scan")
  .description("Print detected capsule source groups")
  .action(async () => {
    const groups = await scanRepository(process.cwd());
    for (const group of groups) {
      console.log(`${group.name}: ${group.files.length} files`);
    }
  });

program
  .command("write")
  .argument("<name>")
  .description("Write or refresh one capsule")
  .action(async (name: string) => {
    const root = process.cwd();
    const groups = await scanRepository(root);
    const group = groups.find((candidate) => candidate.name === name);

    if (!group) {
      throw new Error(`No source group found for capsule: ${name}`);
    }

    await writeGroupCapsule(root, group);
    console.log(`Wrote ${name}`);
  });

program
  .command("get")
  .argument("<name>")
  .description("Print one capsule")
  .action(async (name: string) => {
    const capsule = await readCapsule(process.cwd(), name);
    console.log(capsule.body.trim());
  });

program
  .command("stale")
  .argument("[name]")
  .description("Check capsule source staleness")
  .action(async (name?: string) => {
    const root = process.cwd();
    const names = name ? [name] : (await scanRepository(root)).map((group) => group.name);

    for (const capsuleName of names) {
      const capsule = await readCapsule(root, capsuleName);
      const current = await computeFingerprints(root, capsule.frontmatter.sources);
      const result = compareFingerprints(capsuleName, capsule.frontmatter.fingerprints, current);
      printStale(result);
    }
  });

program
  .command("estimate")
  .argument("<name>")
  .description("Estimate repeated-discovery token savings")
  .action(async (name: string) => {
    const root = process.cwd();
    const capsule = await readCapsule(root, name);
    const current = await computeFingerprints(root, capsule.frontmatter.sources);
    const stale = compareFingerprints(name, capsule.frontmatter.fingerprints, current);
    const staleFiles = [...stale.changed, ...stale.added].sort();
    const sourceFiles = Object.keys(current).sort();

    const estimate = await estimateCapsuleSavings(root, {
      capsulePath: `.capsules/${name}.md`,
      sourceFiles,
      staleFiles,
    });

    console.log(`Capsule: ${name}`);
    console.log("");
    console.log(`Without Capsule: ${estimate.sourceFiles} files / ~${estimate.withoutCapsuleTokens} tokens`);
    console.log(`With Capsule: 1 capsule + ${estimate.staleFiles} stale files / ~${estimate.withCapsuleTokens} tokens`);
    console.log(`Estimated discovery savings: ${estimate.savingsPercent}%`);
  });

async function writeGroupCapsule(root: string, group: SourceGroup): Promise<void> {
  const fingerprints = await computeFingerprints(root, group.sources);

  await writeCapsule(root, {
    frontmatter: {
      name: group.name,
      description: group.description,
      sources: group.sources,
      fingerprints,
      updated_at: new Date().toISOString(),
    },
    body: renderCapsuleBody(group),
    path: `.capsules/${group.name}.md`,
  });
}

function printStale(result: { name: string; fresh: boolean; changed: string[]; missing: string[]; added: string[] }): void {
  if (result.fresh) {
    console.log(`FRESH ${result.name}`);
    return;
  }

  console.log(`STALE ${result.name}`);
  for (const file of result.changed) console.log(`  changed: ${file}`);
  for (const file of result.added) console.log(`  added: ${file}`);
  for (const file of result.missing) console.log(`  missing: ${file}`);
}

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
```

- [ ] **Step 4: Run CLI test**

Run:

```bash
npm test -- tests/cli.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run full checks**

Run:

```bash
npm run typecheck
npm test
npm run build
```

Expected: all PASS.

- [ ] **Step 6: Commit CLI**

```bash
git add src/cli.ts tests/cli.test.ts
git commit -m "feat: add capsule cli commands"
```

## Task 7: README And Agent Snippets

**Files:**
- Create: `README.md`
- Create: `docs/agent-snippets.md`

- [ ] **Step 1: Create README**

Create `README.md`:

```md
# Capsule

Capsule creates compact, source-linked Markdown context packs for coding agents.

MCP gives agents tools. Skills give agents procedures. Capsules give agents compact project context.

## Why

Large repositories make agents burn tokens rediscovering the same files, decisions, and conventions. Capsule targets a 50-70% reduction in repeated repository-discovery context for large, multi-session agent tasks.

## Commands

\`\`\`bash
capsule init
capsule scan
capsule get api
capsule stale api
capsule estimate api
\`\`\`

## Agent Workflow

Agents should:

1. Read `.capsules/index.md`.
2. Load the relevant capsule.
3. Check staleness.
4. Inspect stale source files before editing.
5. Update capsules when durable project knowledge changes.

## Status

Capsule is an early local-first CLI. It does not call paid LLM APIs and does not replace source inspection.
```

- [ ] **Step 2: Create agent snippets**

Create `docs/agent-snippets.md`:

```md
# Agent Snippets

## AGENTS.md

\`\`\`md
Before working in this repo:

1. Read `.capsules/index.md` if it exists.
2. Read the capsule matching the task area.
3. Run `capsule stale <name>` when the CLI is available.
4. If stale, inspect changed source files before editing.
5. Update capsules when durable decisions or conventions change.
\`\`\`

## CLAUDE.md

\`\`\`md
# Capsule Context

Before making changes, read `.capsules/index.md` and the relevant capsule. Use `capsule stale <name>` to detect changed source files. Treat capsules as maps, not source-code replacements.
\`\`\`

## Cursor Rules

\`\`\`md
Use `.capsules/` as the first context layer. Load the relevant capsule before broad repo search. Prefer reading source files listed by stale checks before editing.
\`\`\`
```

- [ ] **Step 3: Commit docs**

```bash
git add README.md docs/agent-snippets.md
git commit -m "docs: explain capsule workflow"
```

## Task 8: Final Verification

**Files:**
- Modify only if verification exposes bugs.

- [ ] **Step 1: Run all checks**

Run:

```bash
npm run typecheck
npm test
npm run build
```

Expected: all PASS.

- [ ] **Step 2: Try CLI on this repo**

Run:

```bash
npm run dev -- init
npm run dev -- stale architecture
npm run dev -- estimate architecture
```

Expected:

- `.capsules/` is created.
- `stale architecture` reports `FRESH architecture`.
- `estimate architecture` prints an estimated discovery savings percentage.

- [ ] **Step 3: Commit generated self-capsules only if useful**

If `.capsules/` output is readable and useful:

```bash
git add .capsules
git commit -m "docs: add capsule context packs"
```

If `.capsules/` output is noisy, leave it uncommitted and improve templates in a follow-up.

## Self-Review

Spec coverage:

- Markdown `.capsules/` format: Task 3.
- Source discovery for any language/framework: Task 2.
- Stale detection with source fingerprints: Task 4.
- 50-70% repeated-discovery savings target and visible metric: Task 5 and Task 6.
- Agent-facing workflow for any agent, including Claude/Codex/Cursor: Task 7.
- Local-only no-LLM v0: enforced by architecture and dependency choices.

Placeholder scan:

- No `TBD`, `TODO`, or undefined implementation steps remain.

Type consistency:

- Shared types are introduced in Task 1 and reused consistently by scanner, format, fingerprint, and CLI tasks.
