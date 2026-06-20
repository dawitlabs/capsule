import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CapsuleFile, CapsuleFrontmatter, CapsuleName } from "./types.js";

export async function writeCapsule(rootDir: string, capsule: CapsuleFile): Promise<void> {
  const target = join(rootDir, capsule.path);
  await mkdir(join(rootDir, ".capsules"), { recursive: true });

  const content = stringifyCapsule(capsule.frontmatter, capsule.body);
  await writeFile(target, content, "utf8");
}

export async function readCapsule(rootDir: string, name: CapsuleName): Promise<CapsuleFile> {
  const path = `.capsules/${name}.md`;
  const raw = await readFile(join(rootDir, path), "utf8");
  const parsed = parseCapsule(raw);

  return {
    frontmatter: parsed.frontmatter,
    body: parsed.body.trimStart(),
    path,
    raw,
  };
}

export function stringifyCapsule(frontmatter: CapsuleFrontmatter, body: string): string {
  return `---json\n${JSON.stringify(frontmatter, null, 2)}\n---\n${body.trimStart()}`;
}

export function parseCapsule(raw: string): { frontmatter: CapsuleFrontmatter; body: string } {
  if (!raw.startsWith("---json\n")) {
    throw new Error("Invalid capsule frontmatter: expected ---json header");
  }

  const end = raw.indexOf("\n---\n", "---json\n".length);
  if (end === -1) {
    throw new Error("Invalid capsule frontmatter: missing closing --- marker");
  }

  const json = raw.slice("---json\n".length, end);
  const body = raw.slice(end + "\n---\n".length);

  return {
    frontmatter: JSON.parse(json) as CapsuleFrontmatter,
    body,
  };
}
