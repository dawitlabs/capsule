import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";

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
});
