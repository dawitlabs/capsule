import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import { DEFAULT_IGNORE } from "./repo-scan.js";
import type { CapsuleName, StaleResult } from "./types.js";

export async function computeFingerprints(rootDir: string, sources: string[]): Promise<Record<string, string>> {
  const files = await fg(sources, {
    cwd: rootDir,
    dot: true,
    onlyFiles: true,
    ignore: DEFAULT_IGNORE,
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
