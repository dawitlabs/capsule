import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compareFingerprints, computeFingerprints } from "../src/fingerprint.js";

describe("fingerprints", () => {
  it("detects changed, missing, and added source files", async () => {
    const root = "tests/.tmp/fingerprint";
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, "src/api"), { recursive: true });
    await writeFile(join(root, "src/api/users.ts"), "one", "utf8");

    const first = await computeFingerprints(root, ["src/api/**"]);

    await rm(join(root, "src/api/users.ts"), { force: true });
    await writeFile(join(root, "src/api/people.ts"), "replacement", "utf8");
    const missingCurrent = await computeFingerprints(root, ["src/api/**"]);
    const missingResult = compareFingerprints("api", first, missingCurrent);
    expect(missingResult.missing).toEqual(["src/api/users.ts"]);

    await writeFile(join(root, "src/api/users.ts"), "two", "utf8");
    await writeFile(join(root, "src/api/posts.ts"), "new", "utf8");

    const current = await computeFingerprints(root, ["src/api/**"]);
    const result = compareFingerprints("api", first, current);

    expect(result.fresh).toBe(false);
    expect(result.changed).toEqual(["src/api/users.ts"]);
    expect(result.added).toEqual(["src/api/people.ts", "src/api/posts.ts"]);
  });
});
