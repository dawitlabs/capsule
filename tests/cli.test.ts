import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProgram, runCli } from "../src/cli.js";

describe("capsule cli", () => {
  it("initializes, reads, checks stale status, and estimates savings", async () => {
    const root = "tests/.tmp/cli";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, "src/api"), { recursive: true });
    await writeFile(join(root, "README.md"), "# Sample", "utf8");
    await writeFile(join(root, "src/api/users.ts"), "export const users = [];", "utf8");

    const output: string[] = [];
    const writeLine = (line: string) => output.push(line);
    await runCli(["node", "capsule", "init"], { root, writeLine });

    output.length = 0;
    await runCli(["node", "capsule", "get", "api"], { root, writeLine });
    expect(output.join("\n")).toContain('"name": "api"');
    expect(output.join("\n")).toContain("# API Capsule");

    output.length = 0;
    await runCli(["node", "capsule", "stale", "api"], { root, writeLine });
    expect(output.join("\n")).toContain("FRESH api");

    await writeFile(join(root, "src/api/users.ts"), "export const users = ['changed'];", "utf8");
    output.length = 0;
    await runCli(["node", "capsule", "stale", "api"], { root, writeLine });
    expect(output.join("\n")).toContain("STALE api");
    expect(output.join("\n")).toContain("changed: src/api/users.ts");

    output.length = 0;
    await runCli(["node", "capsule", "estimate", "api"], { root, writeLine });
    expect(output.join("\n")).toContain("Estimated discovery savings");
  });

  it("preserves human-authored sections on re-write", async () => {
    const root = "tests/.tmp/cli-preserve";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, "src/api"), { recursive: true });
    await writeFile(join(root, "src/api/users.ts"), "export const users = [];", "utf8");

    const writeLine = (line: string) => line;
    await runCli(["node", "capsule", "init"], { root, writeLine });

    // Simulate human edits to the capsule
    const capsulePath = join(root, ".capsules/api.md");
    let capsule = await readFile(capsulePath, "utf8");
    capsule = capsule.replace(
      "- Record stable decisions here so future agents do not rediscover them.",
      "- Always validate with zod at the route boundary.",
    );
    capsule = capsule.replace(
      "- Keep this section updated when durable project conventions are discovered.",
      "- Use snake_case for JSON response fields.",
    );
    await writeFile(capsulePath, capsule, "utf8");

    // Add a new source file so Key Files changes, then re-write
    await writeFile(join(root, "src/api/posts.ts"), "export const posts = [];", "utf8");
    await runCli(["node", "capsule", "write", "api"], { root, writeLine });

    const updated = await readFile(capsulePath, "utf8");

    // Human-authored content survived
    expect(updated).toContain("Always validate with zod at the route boundary.");
    expect(updated).toContain("Use snake_case for JSON response fields.");

    // Machine-owned Key Files was refreshed with the new file
    expect(updated).toContain("src/api/posts.ts");
  });

  it("reads version from package.json (not hardcoded 0.0.0)", () => {
    const program = createProgram({ root: process.cwd(), writeLine: () => {} });
    const version = program.version();
    expect(version).toMatch(/\d+\.\d+\.\d+/);
    expect(version).not.toBe("0.0.0");
  });
});
