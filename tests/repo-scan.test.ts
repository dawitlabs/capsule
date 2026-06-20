import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/repo-scan.js";

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
});
