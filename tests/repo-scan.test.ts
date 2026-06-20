import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig, scanRepository } from "../src/repo-scan.js";

describe("scanRepository", () => {
  it("discovers source groups and ignores heavy directories", async () => {
    const groups = await scanRepository("tests/fixtures/sample-repo");

    const api = groups.find((group) => group.name === "api");
    const data = groups.find((group) => group.name === "data");
    const ui = groups.find((group) => group.name === "ui");
    const testing = groups.find((group) => group.name === "testing");

    expect(api?.files).toContain("src/api/users.ts");
    expect(data?.files).toContain("src/db/schema.ts");
    expect(ui?.files).toContain("src/components/button.tsx");
    expect(testing?.files).toContain("tests/users.test.ts");
    expect(groups.flatMap((group) => group.files)).not.toContain("node_modules/ignored.js");
  });

  it("appends a custom group from .capsules/config.json", async () => {
    const root = "tests/.tmp/repo-scan-config";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, ".capsules"), { recursive: true });
    await mkdir(join(root, "src/workers"), { recursive: true });
    await writeFile(join(root, "src/workers/queue.ts"), "export {};", "utf8");
    await writeFile(
      join(root, ".capsules/config.json"),
      JSON.stringify({ groups: [{ name: "workers", description: "Background jobs.", sources: ["src/workers/**"] }] }),
      "utf8",
    );

    const groups = await scanRepository(root);
    const workers = groups.find((g) => g.name === "workers");
    expect(workers).toBeDefined();
    expect(workers?.files).toContain("src/workers/queue.ts");
  });

  it("overrides a default group by name from config", async () => {
    const root = "tests/.tmp/repo-scan-override";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, ".capsules"), { recursive: true });
    await mkdir(join(root, "handlers"), { recursive: true });
    await writeFile(join(root, "handlers/users.ts"), "export {};", "utf8");
    await writeFile(
      join(root, ".capsules/config.json"),
      JSON.stringify({ groups: [{ name: "api", description: "Overridden.", sources: ["handlers/**"] }] }),
      "utf8",
    );

    const groups = await scanRepository(root);
    const api = groups.find((g) => g.name === "api");
    expect(api?.sources).toEqual(["handlers/**"]);
    expect(api?.files).toContain("handlers/users.ts");
  });

  it("applies custom ignore patterns from config", async () => {
    const root = "tests/.tmp/repo-scan-ignore";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, ".capsules"), { recursive: true });
    await mkdir(join(root, "src/api"), { recursive: true });
    await mkdir(join(root, "legacy/api"), { recursive: true });
    await writeFile(join(root, "src/api/users.ts"), "export {};", "utf8");
    await writeFile(join(root, "legacy/api/old.ts"), "export {};", "utf8");
    await writeFile(join(root, ".capsules/config.json"), JSON.stringify({ ignore: ["legacy/**"] }), "utf8");

    const groups = await scanRepository(root);
    const all = groups.flatMap((g) => g.files);
    expect(all).toContain("src/api/users.ts");
    expect(all).not.toContain("legacy/api/old.ts");
  });
});

describe("loadConfig", () => {
  it("returns empty config when no config.json exists", async () => {
    const config = await loadConfig("tests/fixtures/sample-repo");
    expect(config).toEqual({ groups: [], ignore: [] });
  });

  it("throws a named error for malformed JSON", async () => {
    const root = "tests/.tmp/repo-scan-bad-json";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, ".capsules"), { recursive: true });
    await writeFile(join(root, ".capsules/config.json"), "{ not json", "utf8");
    await expect(loadConfig(root)).rejects.toThrow(".capsules/config.json is not valid JSON");
  });

  it("throws a named error when a group is missing sources", async () => {
    const root = "tests/.tmp/repo-scan-bad-group";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, ".capsules"), { recursive: true });
    await writeFile(join(root, ".capsules/config.json"), JSON.stringify({ groups: [{ name: "workers" }] }), "utf8");
    await expect(loadConfig(root)).rejects.toThrow("sources must be an array");
  });
});
