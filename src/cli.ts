#!/usr/bin/env node
import { stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Command } from "commander";
import { readCapsule, writeCapsule } from "./capsule-format.js";
import { estimateCapsuleSavings } from "./estimate.js";
import { compareFingerprints, computeFingerprints } from "./fingerprint.js";
import { scanRepository } from "./repo-scan.js";
import { renderCapsuleBody, renderIndex } from "./templates.js";
import type { SourceGroup, StaleResult } from "./types.js";

export interface CliRuntime {
  root: string;
  writeLine: (line: string) => void;
}

export async function runCli(argv = process.argv, runtime?: Partial<CliRuntime>): Promise<void> {
  const root = runtime?.root ?? process.cwd();
  const writeLine = runtime?.writeLine ?? console.log;
  const program = createProgram({ root, writeLine });
  await program.parseAsync(argv);
}

export function createProgram(runtime: CliRuntime): Command {
  const program = new Command();

  program.name("capsule").description("Markdown context packs for coding agents").version("0.0.0");

  program
    .command("init")
    .description("Create .capsules starter context packs")
    .action(async () => {
      const groups = await scanRepository(runtime.root);

      for (const group of groups) {
        await writeGroupCapsule(runtime.root, group);
      }

      await writeFile(join(runtime.root, ".capsules", "index.md"), renderIndex(groups), "utf8");
      runtime.writeLine(`Created .capsules with ${groups.length} capsules`);
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
      const names = name ? [name] : (await scanRepository(runtime.root)).map((group) => group.name);

      for (const capsuleName of names) {
        const capsule = await readCapsule(runtime.root, capsuleName);
        const current = await computeFingerprints(runtime.root, capsule.frontmatter.sources);
        const result = compareFingerprints(capsuleName, capsule.frontmatter.fingerprints, current);
        printStale(result, runtime.writeLine);
      }
    });

  program
    .command("estimate")
    .argument("<name>")
    .description("Estimate repeated-discovery token savings")
    .action(async (name: string) => {
      const capsule = await readCapsule(runtime.root, name);
      const current = await computeFingerprints(runtime.root, capsule.frontmatter.sources);
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

  return program;
}

async function writeGroupCapsule(root: string, group: SourceGroup): Promise<void> {
  const fingerprints = await computeFingerprints(root, group.sources);

  await writeCapsule(root, {
    frontmatter: {
      name: group.name,
      description: group.description,
      sources: group.sources,
      fingerprints,
      updated_at: await latestSourceTime(root, Object.keys(fingerprints)),
    },
    body: renderCapsuleBody(group),
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
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
