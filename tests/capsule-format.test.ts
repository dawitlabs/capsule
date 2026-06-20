import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readCapsule, writeCapsule } from "../src/capsule-format.js";
import { renderCapsuleBody } from "../src/templates.js";

describe("capsule format", () => {
  it("writes and reads markdown capsules with frontmatter", async () => {
    const root = "tests/.tmp/capsule-format";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, ".capsules"), { recursive: true });

    await writeCapsule(root, {
      frontmatter: {
        name: "api",
        description: "Request handlers.",
        sources: ["src/api/**"],
        fingerprints: { "src/api/users.ts": "sha256:abc" },
        updated_at: "2026-06-20T00:00:00.000Z",
      },
      body: renderCapsuleBody({
        name: "api",
        description: "Request handlers.",
        sources: ["src/api/**"],
        files: ["src/api/users.ts"],
      }),
      path: ".capsules/api.md",
    });

    const capsule = await readCapsule(root, "api");

    expect(capsule.frontmatter.name).toBe("api");
    expect(capsule.frontmatter.sources).toEqual(["src/api/**"]);
    expect(capsule.body).toContain("# API Capsule");
  });
});
