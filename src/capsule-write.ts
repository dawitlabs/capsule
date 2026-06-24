import { stat } from "node:fs/promises";
import { join } from "node:path";
import { extractGroupContent } from "./capsule-content.js";
import { readCapsule, writeCapsule } from "./capsule-format.js";
import { mergeCapsuleBody } from "./capsule-merge.js";
import { countTokens } from "./estimate.js";
import { computeFingerprints } from "./fingerprint.js";
import { loadConfig } from "./repo-scan.js";
import { renderCapsuleBody } from "./templates.js";
import type { SourceGroup } from "./types.js";

export async function writeGroupCapsule(
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

export async function latestSourceTime(root: string, files: string[]): Promise<string> {
  if (files.length === 0) {
    return "1970-01-01T00:00:00.000Z";
  }

  const mtimes = await Promise.all(files.map(async (file) => (await stat(join(root, file))).mtimeMs));
  return new Date(Math.max(...mtimes)).toISOString();
}
