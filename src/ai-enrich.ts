import { execFile, spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as rl from "node:readline/promises";
import type { SourceGroup } from "./types.js";

export interface AiEnrichResult {
  [groupName: string]: { conventions: string[]; decisions: string[] };
}

// Files that reveal which AI the developer uses in this project.
const AI_SIGNALS: Array<{ files: string[]; tool: "claude" | "openai" }> = [
  { files: ["CLAUDE.md", ".claude/settings.json"], tool: "claude" },
  { files: [".cursorrules"], tool: "claude" }, // Cursor defaults to Claude
  { files: ["AGENTS.md", ".openai/"], tool: "openai" },
  { files: [".windsurfrules"], tool: "openai" },
];

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function detectProjectAiPreference(root: string): Promise<"claude" | "openai" | null> {
  for (const signal of AI_SIGNALS) {
    for (const file of signal.files) {
      if (await fileExists(join(root, file))) return signal.tool;
    }
  }
  return null;
}

export interface EnrichOption {
  id: "claude-cli" | "claude" | "openai" | "prompt";
  label: string;
  available: boolean;
}

const CLI_TOOLS: Array<{ cmd: string; id: "claude-cli"; label: string }> = [
  { cmd: "claude", id: "claude-cli", label: "Claude Code  (claude CLI — uses your existing auth, no API key needed)" },
];

async function detectInstalledCli(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const which = process.platform === "win32" ? "where" : "which";
    execFile(which, [name], (err) => resolve(err === null));
  });
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_MESSAGES = [
  "reading your codebase",
  "extracting patterns",
  "writing capsules",
  "analyzing conventions",
  "mapping decisions",
];

function withSpinner<T>(task: () => Promise<T>): Promise<T> {
  if (!process.stdout.isTTY) return task();

  let tick = 0;
  const draw = () => {
    const f = SPINNER_FRAMES[tick % SPINNER_FRAMES.length];
    const m = SPINNER_MESSAGES[Math.floor(tick / 10) % SPINNER_MESSAGES.length];
    process.stdout.write(`\r  ${f}  ${m}...`);
    tick++;
  };

  draw();
  const timer = setInterval(draw, 80);
  const stop = () => {
    clearInterval(timer);
    process.stdout.write("\r\x1b[K");
  };

  return task().then(
    (result) => {
      stop();
      return result;
    },
    (err: unknown) => {
      stop();
      throw err;
    },
  );
}

function spawnClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Run from tmpdir so claude doesn't load the project's CLAUDE.md / MCP tools.
    const proc = spawn("claude", ["--print"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: tmpdir(),
      timeout: 120_000,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`claude exited with code ${code}: ${stderr.slice(0, 200)}`));
      } else {
        resolve(stdout);
      }
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

async function callClaudeCli(fileContext: string, groups: SourceGroup[]): Promise<AiEnrichResult> {
  // One subprocess per group, all in parallel — each generates ~200 tokens instead of ~1500 serial.
  const settled = await Promise.allSettled(
    groups.map(async (group) => {
      const raw = await spawnClaude(buildGroupPrompt(fileContext, group));
      const stripped = raw
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/\s*```\s*$/m, "")
        .trim();
      const parsed = JSON.parse(stripped) as { conventions?: unknown; decisions?: unknown };
      return { name: group.name, parsed };
    }),
  );

  const result: AiEnrichResult = {};
  for (const s of settled) {
    if (s.status === "rejected") continue;
    const { name, parsed } = s.value;
    result[name] = {
      conventions: Array.isArray(parsed.conventions)
        ? (parsed.conventions as unknown[]).filter((x): x is string => typeof x === "string")
        : [],
      decisions: Array.isArray(parsed.decisions)
        ? (parsed.decisions as unknown[]).filter((x): x is string => typeof x === "string")
        : [],
    };
  }

  return result;
}

export async function getEnrichOptions(root: string): Promise<EnrichOption[]> {
  const [preference, ...cliPresent] = await Promise.all([
    detectProjectAiPreference(root),
    ...CLI_TOOLS.map((t) => detectInstalledCli(t.cmd)),
  ]);

  const options: EnrichOption[] = [];

  // CLI tools come first — no API key required.
  for (let i = 0; i < CLI_TOOLS.length; i++) {
    const tool = CLI_TOOLS[i];
    if (tool && cliPresent[i]) {
      options.push({ id: tool.id, label: tool.label, available: true });
    }
  }

  // API-based options.
  options.push({
    id: "claude",
    label: process.env.ANTHROPIC_API_KEY
      ? "Claude API  (ANTHROPIC_API_KEY ✓)"
      : "Claude API  (ANTHROPIC_API_KEY not set)",
    available: Boolean(process.env.ANTHROPIC_API_KEY),
  });
  options.push({
    id: "openai",
    label: process.env.OPENAI_API_KEY
      ? "OpenAI GPT-4o API  (OPENAI_API_KEY ✓)"
      : "OpenAI GPT-4o API  (OPENAI_API_KEY not set)",
    available: Boolean(process.env.OPENAI_API_KEY),
  });

  // Always available — works with any browser AI session.
  options.push({
    id: "prompt",
    label: "Generate prompt  (paste into Claude.ai / ChatGPT / Cursor / any AI)",
    available: true,
  });

  // If project prefers OpenAI and no CLI is installed, put OpenAI API before Claude API.
  if (preference === "openai" && !cliPresent[0]) {
    const ci = options.findIndex((o) => o.id === "claude");
    const oi = options.findIndex((o) => o.id === "openai");
    if (ci >= 0 && oi >= 0) [options[ci], options[oi]] = [options[oi] as EnrichOption, options[ci] as EnrichOption];
  }

  return options;
}

export async function promptAiSelection(
  options: EnrichOption[],
  writeLine: (s: string) => void,
): Promise<"claude-cli" | "claude" | "openai" | "prompt" | null> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return null;

  writeLine("");
  writeLine("Enrich capsules with AI? (much richer content than static analysis)");
  writeLine("");

  let displayIndex = 0;
  const indexMap: number[] = []; // maps display number → options index
  options.forEach((o, i) => {
    if (o.available) {
      displayIndex++;
      indexMap.push(i);
      writeLine(`  ${displayIndex}. ${o.label}`);
    } else {
      writeLine(`  -  ${o.label}`);
    }
  });
  writeLine("  0. Skip — use static analysis only");
  writeLine("");

  const iface = rl.createInterface({ input: process.stdin, output: process.stdout });
  let answer: string;
  try {
    answer = await iface.question("  Pick [0]: ");
  } finally {
    iface.close();
  }

  const n = Number.parseInt(answer.trim() || "0", 10);
  if (n === 0 || Number.isNaN(n)) return null;

  const optionIndex = indexMap[n - 1];
  if (optionIndex === undefined) return null;
  const choice = options[optionIndex];
  if (!choice?.available) return null;
  return choice.id;
}

// Build a concise file dump for the AI prompt (~30KB max).
export async function buildFileContext(root: string, groups: SourceGroup[]): Promise<string> {
  const MAX_FILE = 1_800;
  const seen = new Set<string>();
  const parts: string[] = [];

  // Priority files regardless of group.
  const priority = [
    "package.json",
    "turbo.json",
    "apps/web/package.json",
    "apps/server/package.json",
    "packages/db/package.json",
  ];
  for (const f of priority) {
    if (seen.has(f)) continue;
    try {
      const raw = await readFile(join(root, f), "utf8");
      parts.push(`### ${f}\n${raw.slice(0, MAX_FILE)}`);
      seen.add(f);
    } catch {
      // doesn't exist
    }
  }

  // Up to 3 files per group (skip already-seen).
  for (const group of groups) {
    let added = 0;
    for (const file of group.files) {
      if (added >= 3) break;
      if (seen.has(file)) continue;
      try {
        const raw = await readFile(join(root, file), "utf8");
        parts.push(`### ${file}\n${raw.slice(0, MAX_FILE)}`);
        seen.add(file);
        added++;
      } catch {
        // skip
      }
    }
  }

  return parts.join("\n\n");
}

export function buildPrompt(fileContext: string, groups: SourceGroup[]): string {
  const groupList = groups.map((g) => `- ${g.name}: ${g.description}`).join("\n");

  return `You are analyzing a software project to write AI coding-agent context capsules.
Capsules help agents understand a codebase without re-reading every file each session.

PROJECT FILES:
${fileContext}

CAPSULE GROUPS TO FILL:
${groupList}

For each group that has matching files, write:
- "conventions": HOW code is written here — observable, specific patterns (not generic advice)
- "decisions": WHY — tool choices, architectural tradeoffs, setup decisions specific to this project

Output ONLY valid JSON (no markdown fences):
{
  "architecture": { "conventions": ["- ..."], "decisions": ["- ..."] },
  "setup": { "conventions": ["- ..."], "decisions": ["- ..."] }
}

Rules:
- Bullet items start with "- " (dash space)
- 2–4 items per section
- One clear sentence each
- If a group has no relevant files, omit it from the output
- Be SPECIFIC to this exact codebase — no boilerplate`;
}

function buildGroupPrompt(fileContext: string, group: SourceGroup): string {
  return `You are writing a context capsule for the "${group.name}" section of a software project.
${group.description}

PROJECT FILES:
${fileContext}

Write ONLY for "${group.name}":
- "conventions": HOW code is written — observable patterns from the actual files
- "decisions": WHY — tool choices, architectural decisions specific to this project

Output ONLY valid JSON (no markdown, no other text):
{"conventions": ["- item"], "decisions": ["- item"]}

Rules: bullet items start "- ", 1-3 items per section, specific to this exact codebase.`;
}

export function parseAiResponse(text: string): AiEnrichResult {
  // Strip markdown code fences if present.
  const stripped = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  const parsed = JSON.parse(stripped) as Record<string, { conventions?: unknown; decisions?: unknown }>;
  const result: AiEnrichResult = {};

  for (const [name, value] of Object.entries(parsed)) {
    if (typeof value !== "object" || value === null) continue;
    result[name] = {
      conventions: Array.isArray(value.conventions)
        ? (value.conventions as unknown[]).filter((x): x is string => typeof x === "string")
        : [],
      decisions: Array.isArray(value.decisions)
        ? (value.decisions as unknown[]).filter((x): x is string => typeof x === "string")
        : [],
    };
  }

  return result;
}

async function callClaude(prompt: string): Promise<AiEnrichResult> {
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2_000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);

  const data = (await res.json()) as { content: Array<{ type: string; text: string }> };
  const text = data.content.find((b) => b.type === "text")?.text ?? "";
  return parseAiResponse(text);
}

async function callOpenAI(prompt: string): Promise<AiEnrichResult> {
  const key = process.env.OPENAI_API_KEY ?? "";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 2_000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error ${res.status}`);

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const text = data.choices[0]?.message.content ?? "";
  return parseAiResponse(text);
}

export async function enrichWithAI(
  choice: "claude-cli" | "claude" | "openai" | "prompt",
  root: string,
  groups: SourceGroup[],
  writeLine: (s: string) => void,
): Promise<AiEnrichResult | null> {
  const fileContext = await buildFileContext(root, groups);
  const prompt = buildPrompt(fileContext, groups);

  if (choice === "prompt") {
    const promptPath = join(root, ".capsules", "enrich-prompt.md");
    await writeFile(promptPath, prompt, "utf8");
    writeLine("");
    writeLine("  Prompt written to .capsules/enrich-prompt.md");
    writeLine("");
    writeLine("  1. Open that file and paste its contents into Claude.ai, ChatGPT, Cursor, or any AI.");
    writeLine("  2. Copy the JSON the AI responds with.");
    writeLine("  3. Run:  capsule apply");
    writeLine("     (then paste the JSON and press Ctrl-D)");
    writeLine("");
    return null;
  }

  const label = choice === "claude-cli" ? "claude CLI" : choice === "claude" ? "Claude" : "OpenAI";

  writeLine("");
  try {
    const result = await (choice === "claude-cli"
      ? withSpinner(() => callClaudeCli(fileContext, groups))
      : withSpinner(() => (choice === "claude" ? callClaude(prompt) : callOpenAI(prompt))));
    writeLine(`  Done — ${Object.keys(result).length} capsules enriched via ${label}.`);
    return result;
  } catch (err) {
    writeLine(`  ${label} failed: ${err instanceof Error ? err.message : String(err)}`);
    writeLine("  Falling back to static analysis.");
    return null;
  }
}
