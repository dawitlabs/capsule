import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { estimateCapsuleSavings } from "../src/estimate.js";

describe("estimateCapsuleSavings", () => {
  it("estimates discovery savings from source files versus capsule text", async () => {
    const root = "tests/.tmp/estimate";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, "src/api"), { recursive: true });
    await mkdir(join(root, ".capsules"), { recursive: true });

    await writeFile(join(root, "src/api/users.ts"), "a".repeat(4000), "utf8");
    await writeFile(join(root, "src/api/posts.ts"), "b".repeat(4000), "utf8");
    await writeFile(join(root, ".capsules/api.md"), "capsule".repeat(50), "utf8");

    const result = await estimateCapsuleSavings(root, {
      capsulePath: ".capsules/api.md",
      sourceFiles: ["src/api/users.ts", "src/api/posts.ts"],
      staleFiles: [],
    });

    expect(result.withoutCapsuleTokens).toBe(2000);
    expect(result.withCapsuleTokens).toBeLessThan(200);
    expect(result.savingsPercent).toBeGreaterThan(90);
  });
});
