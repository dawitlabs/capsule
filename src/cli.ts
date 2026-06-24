#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import {
  buildFileContext,
  buildPrompt,
  enrichWithAI,
  getEnrichOptions,
  parseAiResponse,
  promptAiSelection,
} from "./ai-enrich.js";
import { extractGroupContent } from "./capsule-content.js";
import { readCapsule, writeCapsule } from "./capsule-format.js";
import { mergeCapsuleBody } from "./capsule-merge.js";
import { type CapsuleStatEntry, countFileTokens, countTokens, estimateCapsuleSavings } from "./estimate.js";
import { compareFingerprints, computeFingerprints } from "./fingerprint.js";
import { loadConfig, scanRepository } from "./repo-scan.js";
import { renderBanner, renderCapsuleBody, renderIndex } from "./templates.js";
import type { SourceGroup, StaleResult } from "./types.js";

const pkg = JSON.parse(readFileSync(join(fileURLToPath(import.meta.url), "../../package.json"), "utf8")) as {
  version: string;
};

export interface CliRuntime {
  root: string;
  writeLine: (line: string) => void;
}

export async function runCli(argv = process.argv, runtime?: Partial<CliRuntime>): Promise<void> {
  const root = runtime?.root ?? process.cwd();
  const writeLine = runtime?.writeLine ?? console.log;
  const program = createProgram({ root, writeLine });
  try {
    await program.parseAsync(argv);
  } catch (error: unknown) {
    // Re-throw commander's own exits (--help, --version) silently.
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "commander.helpDisplayed"
    )
      return;
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "commander.version")
      return;
    throw error;
  }
}

function friendlyError(error: unknown, root: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("ENOENT") && msg.includes(".capsules")) {
    return `No .capsules directory found in ${root}\nRun: capsule init`;
  }
  return msg;
}

export function createProgram(runtime: CliRuntime): Command {
  const program = new Command();

  program
    .name("capsule")
    .description("Markdown context packs for coding agents")
    .version(pkg.version)
    .exitOverride()
    .configureOutput({
      writeErr: (str) => process.stderr.write(str),
    });

  program.on("command:*", () => {
    process.stderr.write(`Unknown command: ${program.args.join(" ")}\n`);
    program.help();
  });

  program
    .command("init")
    .description("Create .capsules starter context packs")
    .action(async () => {
      runtime.writeLine(renderBanner(pkg.version));
      const groups = await scanRepository(runtime.root);

      // Optional AI enrichment — show selection if API keys are present.
      const enrichOptions = await getEnrichOptions(runtime.root);
      const aiChoice = await promptAiSelection(enrichOptions, runtime.writeLine);
      const aiContent = aiChoice ? await enrichWithAI(aiChoice, runtime.root, groups, runtime.writeLine) : null;

      for (const group of groups) {
        await writeGroupCapsule(runtime.root, group, aiContent?.[group.name] ?? undefined);
      }

      await writeFile(join(runtime.root, ".capsules", "index.md"), renderIndex(groups), "utf8");
      runtime.writeLine(`\nCreated .capsules with ${groups.length} capsules`);

      const patched = await patchAgentFiles(runtime.root);
      for (const result of patched) {
        runtime.writeLine(result);
      }

      await printStats(runtime, groups);
    });

  program
    .command("scan")
    .description("Print detected capsule source groups")
    .action(async () => {
      const groups = await scanRepository(runtime.root);
      for (const group of groups) {
        runtime.writeLine(`${group.name}: ${group.files.length} files`);
      }
    });

  program
    .command("write")
    .argument("<name>")
    .description("Write or refresh one capsule")
    .action(async (name: string) => {
      const groups = await scanRepository(runtime.root);
      const group = groups.find((candidate) => candidate.name === name);

      if (!group) {
        throw new Error(`No source group found for capsule: ${name}`);
      }

      await writeGroupCapsule(runtime.root, group);
      runtime.writeLine(`Wrote ${name}`);
    });

  program
    .command("get")
    .argument("<name>")
    .description("Print one capsule")
    .action(async (name: string) => {
      const capsule = await readCapsule(runtime.root, name);
      runtime.writeLine((capsule.raw ?? capsule.body).trim());
    });

  program
    .command("stale")
    .argument("[name]")
    .description("Check capsule source staleness")
    .action(async (name?: string) => {
      const config = await loadConfig(runtime.root);
      const names = name ? [name] : (await scanRepository(runtime.root)).map((group) => group.name);

      for (const capsuleName of names) {
        const capsule = await readCapsule(runtime.root, capsuleName);
        const current = await computeFingerprints(runtime.root, capsule.frontmatter.sources, config.ignore);
        const result = compareFingerprints(capsuleName, capsule.frontmatter.fingerprints, current);
        printStale(result, runtime.writeLine);

        if (!result.fresh) {
          const staleFiles = [...result.changed, ...result.added].sort();
          const staleTokens = await countFileTokens(runtime.root, staleFiles);
          runtime.writeLine(`  stale tokens: ${staleTokens.toLocaleString("en-US")} (agent must re-read these)`);
        }
      }
    });

  program
    .command("estimate")
    .argument("<name>")
    .description("Estimate repeated-discovery token savings")
    .action(async (name: string) => {
      const config = await loadConfig(runtime.root);
      const capsule = await readCapsule(runtime.root, name);
      const current = await computeFingerprints(runtime.root, capsule.frontmatter.sources, config.ignore);
      const stale = compareFingerprints(name, capsule.frontmatter.fingerprints, current);
      const staleFiles = [...stale.changed, ...stale.added].sort();
      const sourceFiles = Object.keys(current).sort();

      const estimate = await estimateCapsuleSavings(runtime.root, {
        capsulePath: `.capsules/${name}.md`,
        sourceFiles,
        staleFiles,
      });

      runtime.writeLine(`Capsule: ${name}`);
      runtime.writeLine("");
      runtime.writeLine("Without Capsule:");
      runtime.writeLine(`  files: ${estimate.sourceFiles}`);
      runtime.writeLine(`  estimated tokens: ${estimate.withoutCapsuleTokens.toLocaleString("en-US")}`);
      runtime.writeLine("");
      runtime.writeLine("With Capsule:");
      runtime.writeLine(`  capsule plus stale files: ${1 + estimate.staleFiles}`);
      runtime.writeLine(`  stale source files: ${estimate.staleFiles}`);
      runtime.writeLine(`  estimated tokens: ${estimate.withCapsuleTokens.toLocaleString("en-US")}`);
      runtime.writeLine("");
      runtime.writeLine(`Estimated discovery savings: ${estimate.savingsPercent}%`);
    });

  program
    .command("stats")
    .description("Show token savings across all capsules")
    .action(async () => {
      const groups = await scanRepository(runtime.root);
      await printStats(runtime, groups);
    });

  program
    .command("apply")
    .description("Apply AI-generated JSON to capsule Conventions and Decisions (reads stdin)")
    .action(async () => {
      const groups = await scanRepository(runtime.root);

      // Try reading from a prompt file first, otherwise stdin.
      let input = "";
      try {
        input = await readFile(join(runtime.root, ".capsules", "enrich-response.md"), "utf8");
      } catch {
        if (!process.stdin.isTTY) {
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
          input = Buffer.concat(chunks).toString("utf8");
        } else {
          runtime.writeLine("Paste the JSON from your AI, then press Ctrl-D:");
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
          input = Buffer.concat(chunks).toString("utf8");
        }
      }

      let aiContent: ReturnType<typeof parseAiResponse>;
      try {
        aiContent = parseAiResponse(input);
      } catch {
        throw new Error("Could not parse AI response as JSON. Make sure you copied the full JSON output.");
      }

      let applied = 0;
      for (const group of groups) {
        const enrichment = aiContent[group.name];
        if (!enrichment) continue;
        await writeGroupCapsule(runtime.root, group, enrichment);
        applied++;
      }

      runtime.writeLine(`Applied AI enrichment to ${applied} capsule${applied !== 1 ? "s" : ""}.`);
    });

  program
    .command("enrich")
    .description("Re-enrich existing capsules with AI (same options as init)")
    .action(async () => {
      const groups = await scanRepository(runtime.root);
      const enrichOptions = await getEnrichOptions(runtime.root);
      const aiChoice = await promptAiSelection(enrichOptions, runtime.writeLine);

      if (!aiChoice) {
        // No API keys and user skipped — write prompt file for browser users.
        const fileContext = await buildFileContext(runtime.root, groups);
        const prompt = buildPrompt(fileContext, groups);
        const promptPath = join(runtime.root, ".capsules", "enrich-prompt.md");
        await writeFile(promptPath, prompt, "utf8");
        runtime.writeLine("Prompt written to .capsules/enrich-prompt.md");
        runtime.writeLine("Paste it into your AI, copy the JSON response, then run: capsule apply");
        return;
      }

      const aiContent = await enrichWithAI(aiChoice, runtime.root, groups, runtime.writeLine);
      if (!aiContent) return;

      let applied = 0;
      for (const group of groups) {
        const enrichment = aiContent[group.name];
        if (!enrichment) continue;
        await writeGroupCapsule(runtime.root, group, enrichment);
        applied++;
      }
      runtime.writeLine(`Enriched ${applied} capsule${applied !== 1 ? "s" : ""}.`);
    });

  return program;
}

const AGENT_FILES = ["CLAUDE.md", "AGENTS.md", ".cursorrules", ".windsurfrules"];

const CAPSULE_MARKER_START = "<!-- capsule -->";
const CAPSULE_MARKER_END = "<!-- /capsule -->";

const CAPSULE_SNIPPET = `${CAPSULE_MARKER_START}
## Capsule Context

Before working in this repo:

1. Read \`.capsules/index.md\`.
2. Read the capsule matching the task area.
3. Run \`capsule stale <name>\` to check if sources changed.
4. If stale, inspect the changed files before editing.
5. Update capsules when durable project knowledge changes.
${CAPSULE_MARKER_END}`;

async function patchAgentFiles(root: string): Promise<string[]> {
  const results: string[] = [];

  for (const filename of AGENT_FILES) {
    const path = join(root, filename);
    let existing = "";
    let existed = false;

    try {
      existing = await readFile(path, "utf8");
      existed = true;
    } catch {
      // file doesn't exist yet — will create it
    }

    if (existing.includes(CAPSULE_MARKER_START)) {
      // already patched — skip silently
      continue;
    }

    const content = existed ? `${existing.trimEnd()}\n\n${CAPSULE_SNIPPET}\n` : `${CAPSULE_SNIPPET}\n`;
    await writeFile(path, content, "utf8");
    results.push(
      existed ? `Updated ${filename} with capsule instructions` : `Created ${filename} with capsule instructions`,
    );
  }

  return results;
}

async function writeGroupCapsule(
  root: string,
  group: SourceGroup,
  aiOverride?: { conventions: string[]; decisions: string[] },
): Promise<void> {
  const config = await loadConfig(root);
  const fingerprints = await computeFingerprints(root, group.sources, config.ignore);

  const content = await extractGroupContent(root, group.name, group.files);
  if (aiOverride) {
    if (aiOverride.conventions.length > 0) content.conventions = aiOverride.conventions;
    if (aiOverride.decisions.length > 0) content.decisions = aiOverride.decisions;
  }
  let body = renderCapsuleBody(group, content);

  // Preserve human-authored sections from an existing capsule.
  try {
    const existing = await readCapsule(root, group.name);
    body = mergeCapsuleBody(body, existing.body);
  } catch {
    // No existing capsule — write fresh.
  }

  if (config.maxTokensPerCapsule) {
    body = trimToTokenBudget(body, config.maxTokensPerCapsule);
  }

  await writeCapsule(root, {
    frontmatter: {
      name: group.name,
      description: group.description,
      sources: group.sources,
      fingerprints,
      updated_at: await latestSourceTime(root, Object.keys(fingerprints)),
    },
    body,
    path: `.capsules/${group.name}.md`,
  });
}

async function latestSourceTime(root: string, files: string[]): Promise<string> {
  if (files.length === 0) {
    return "1970-01-01T00:00:00.000Z";
  }

  const mtimes = await Promise.all(files.map(async (file) => (await stat(join(root, file))).mtimeMs));
  return new Date(Math.max(...mtimes)).toISOString();
}

function trimToTokenBudget(body: string, maxTokens: number): string {
  const sections = body.split(/(?=^## )/m);
  let result = "";
  for (const section of sections) {
    const candidate = result + section;
    if (countTokens(candidate) > maxTokens && result.length > 0) break;
    result = candidate;
  }
  return result;
}

async function printStats(runtime: CliRuntime, groups: SourceGroup[]): Promise<void> {
  const config = await loadConfig(runtime.root);
  const entries: CapsuleStatEntry[] = [];

  for (const group of groups) {
    try {
      const capsule = await readCapsule(runtime.root, group.name);
      const current = await computeFingerprints(runtime.root, capsule.frontmatter.sources, config.ignore);
      const stale = compareFingerprints(group.name, capsule.frontmatter.fingerprints, current);
      const staleFiles = [...stale.changed, ...stale.added].sort();
      const sourceFiles = Object.keys(current).sort();

      const estimate = await estimateCapsuleSavings(runtime.root, {
        capsulePath: `.capsules/${group.name}.md`,
        sourceFiles,
        staleFiles,
      });

      entries.push({
        name: group.name,
        sourceFiles: estimate.sourceFiles,
        sourceTokens: estimate.withoutCapsuleTokens,
        capsuleTokens: estimate.withCapsuleTokens,
        savingsPercent: estimate.savingsPercent,
        staleFiles: estimate.staleFiles,
      });
    } catch {
      // capsule not yet written
    }
  }

  if (entries.length === 0) return;

  const totalSource = entries.reduce((sum, e) => sum + e.sourceTokens, 0);
  const totalCapsule = entries.reduce((sum, e) => sum + e.capsuleTokens, 0);
  const totalSavings = totalSource === 0 ? 0 : Math.round(((totalSource - totalCapsule) / totalSource) * 100);

  runtime.writeLine("");
  runtime.writeLine("Token savings:");
  runtime.writeLine("");

  const nameWidth = Math.max(7, ...entries.map((e) => e.name.length));

  runtime.writeLine(
    `  ${"capsule".padEnd(nameWidth)}  ${"source".padStart(8)}  ${"capsule".padStart(8)}  ${"saved".padStart(6)}  stale`,
  );
  runtime.writeLine(
    `  ${"─".repeat(nameWidth)}  ${"─".repeat(8)}  ${"─".repeat(8)}  ${"─".repeat(6)}  ${"─".repeat(5)}`,
  );

  for (const entry of entries) {
    const staleTag = entry.staleFiles > 0 ? `${entry.staleFiles} files` : "fresh";
    runtime.writeLine(
      `  ${entry.name.padEnd(nameWidth)}  ${entry.sourceTokens.toLocaleString("en-US").padStart(8)}  ${entry.capsuleTokens.toLocaleString("en-US").padStart(8)}  ${`${entry.savingsPercent}%`.padStart(6)}  ${staleTag}`,
    );
  }

  runtime.writeLine(
    `  ${"─".repeat(nameWidth)}  ${"─".repeat(8)}  ${"─".repeat(8)}  ${"─".repeat(6)}  ${"─".repeat(5)}`,
  );
  runtime.writeLine(
    `  ${"total".padEnd(nameWidth)}  ${totalSource.toLocaleString("en-US").padStart(8)}  ${totalCapsule.toLocaleString("en-US").padStart(8)}  ${`${totalSavings}%`.padStart(6)}`,
  );
  runtime.writeLine("");
}

function printStale(result: StaleResult, writeLine: (line: string) => void): void {
  if (result.fresh) {
    writeLine(`FRESH ${result.name}`);
    return;
  }

  writeLine(`STALE ${result.name}`);
  for (const file of result.changed) writeLine(`  changed: ${file}`);
  for (const file of result.added) writeLine(`  added: ${file}`);
  for (const file of result.missing) writeLine(`  missing: ${file}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = process.cwd();
  runCli().catch((error: unknown) => {
    process.stderr.write(`${friendlyError(error, root)}\n`);
    process.exitCode = 1;
  });
}
