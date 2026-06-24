import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { countTokens, estimateCapsuleSavings } from "../src/estimate.js";

describe("countTokens", () => {
  it("returns accurate token count for code", () => {
    const code = "export async function estimateTokens(chars: number): number { return Math.ceil(chars / 4); }";
    const tokens = countTokens(code);
    expect(tokens).toBeGreaterThan(10);
    expect(tokens).toBeLessThan(40);
  });

  it("returns 0 for empty string", () => {
    expect(countTokens("")).toBe(0);
  });
});

describe("estimateCapsuleSavings", () => {
  it("estimates discovery savings from source files versus capsule text", async () => {
    const root = "tests/.tmp/estimate";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, "src/api"), { recursive: true });
    await mkdir(join(root, ".capsules"), { recursive: true });

    const sourceCode = [
      "import { db } from '../db';",
      "export async function getUsers() { return db.select().from(users); }",
      "export async function createUser(data: NewUser) { return db.insert(users).values(data); }",
      "export async function deleteUser(id: string) { return db.delete(users).where(eq(users.id, id)); }",
      "export const userSchema = z.object({ name: z.string(), email: z.string() });",
    ].join("\n");

    await writeFile(join(root, "src/api/users.ts"), sourceCode, "utf8");
    await writeFile(join(root, "src/api/posts.ts"), sourceCode.replace(/user/g, "post"), "utf8");
    await writeFile(join(root, ".capsules/api.md"), "# API Capsule\n\nSmall summary.", "utf8");

    const result = await estimateCapsuleSavings(root, {
      capsulePath: ".capsules/api.md",
      sourceFiles: ["src/api/users.ts", "src/api/posts.ts"],
      staleFiles: [],
    });

    expect(result.withoutCapsuleTokens).toBeGreaterThan(20);
    expect(result.withCapsuleTokens).toBeLessThan(result.withoutCapsuleTokens);
    expect(result.savingsPercent).toBeGreaterThan(50);
  });
});
