import { readFile, writeFile } from "node:fs/promises";
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
  id: "claude" | "openai" | "prompt";
  label: string;
  available: boolean;
}

export async function getEnrichOptions(root: string): Promise<EnrichOption[]> {
  const preference = await detectProjectAiPreference(root);

  const options: EnrichOption[] = [
    {
      id: "claude",
      label: process.env.ANTHROPIC_API_KEY
        ? "Claude API  (ANTHROPIC_API_KEY ✓)"
        : "Claude API  (ANTHROPIC_API_KEY not set)",
      available: Boolean(process.env.ANTHROPIC_API_KEY),
    },
    {
      id: "openai",
      label: process.env.OPENAI_API_KEY
        ? "OpenAI GPT-4o API  (OPENAI_API_KEY ✓)"
        : "OpenAI GPT-4o API  (OPENAI_API_KEY not set)",
      available: Boolean(process.env.OPENAI_API_KEY),
    },
    {
      // Always available — works with Claude.ai, ChatGPT, Cursor, Windsurf, Copilot, any browser session.
      id: "prompt",
      label: "Generate prompt  (paste into Claude.ai / ChatGPT / Cursor / any AI)",
      available: true,
    },
  ];

  // Put the project's preferred API-based AI first.
  if (preference === "openai") {
    const [claude, openai, ...rest] = options;
    return [openai, claude, ...rest];
  }

  return options;
}

export async function promptAiSelection(
  options: EnrichOption[],
  writeLine: (s: string) => void,
): Promise<"claude" | "openai" | "prompt" | null> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return null;

  writeLine("");
  writeLine("Enrich capsules with AI? (much richer content than static analysis)");
  writeLine("");
  options.forEach((o, i) => {
    const marker = o.available ? `  ${i + 1}.` : "  -";
    writeLine(`${marker} ${o.label}`);
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

  const choice = options[n - 1];
  if (!choice) return null;
  if (!choice.available) {
    writeLine(`  Set ${choice.id === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"} to use this option.`);
    return null;
  }
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
  choice: "claude" | "openai" | "prompt",
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

  writeLine("");
  writeLine(`  Analyzing with ${choice === "claude" ? "Claude" : "OpenAI"}...`);

  try {
    const result = choice === "claude" ? await callClaude(prompt) : await callOpenAI(prompt);
    writeLine(`  Done — ${Object.keys(result).length} capsules enriched.`);
    return result;
  } catch (err) {
    writeLine(`  AI enrichment failed: ${err instanceof Error ? err.message : String(err)}`);
    writeLine("  Falling back to static analysis.");
    return null;
  }
}
