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
    raw,
  };
}
