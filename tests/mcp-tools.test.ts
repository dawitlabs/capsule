import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { registerResources } from "../src/mcp/resources.js";
import { createMcpServer } from "../src/mcp/server.js";
import { registerTools } from "../src/mcp/tools.js";

const root = "tests/.tmp/mcp";

async function setupFixture() {
  await rm(root, { recursive: true, force: true });
  await mkdir(join(root, "src/api"), { recursive: true });
  await writeFile(join(root, "README.md"), "# Test Project", "utf8");
  await writeFile(join(root, "package.json"), '{"name":"test","version":"1.0.0"}', "utf8");
  await writeFile(join(root, "src/api/users.ts"), "export const users = [];", "utf8");
}

async function createConnectedPair() {
  const server = createMcpServer("0.0.0-test");
  registerTools(server, root);
  registerResources(server, root);

  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { server, client };
}

describe("mcp tools", () => {
  let server: Awaited<ReturnType<typeof createConnectedPair>>["server"];
  let client: Client;

  afterEach(async () => {
    await client?.close();
    await server?.close();
  });

  it("capsule_init creates capsules and capsule_list returns them", async () => {
    await setupFixture();
    ({ server, client } = await createConnectedPair());

    const initResult = await client.callTool({ name: "capsule_init" });
    const initText = (initResult.content as Array<{ text: string }>)[0].text;
    expect(initText).toContain("capsules:");

    const index = await readFile(join(root, ".capsules", "index.md"), "utf8");
    expect(index).toContain("architecture");

    const listResult = await client.callTool({ name: "capsule_list" });
    const items = JSON.parse((listResult.content as Array<{ text: string }>)[0].text);
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i: { name: string }) => i.name === "architecture")).toBe(true);
    expect(items.find((i: { name: string }) => i.name === "architecture").status).toBe("fresh");
  });

  it("capsule_get returns capsule body", async () => {
    await setupFixture();
    ({ server, client } = await createConnectedPair());
    await client.callTool({ name: "capsule_init" });

    const result = await client.callTool({ name: "capsule_get", arguments: { name: "architecture" } });
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(text).toContain("# Architecture Capsule");
    expect(result.isError).toBeFalsy();
  });

  it("capsule_get auto-refreshes stale capsules", async () => {
    await setupFixture();
    ({ server, client } = await createConnectedPair());
    await client.callTool({ name: "capsule_init" });

    await writeFile(join(root, "src/api/users.ts"), "export const users = ['changed'];", "utf8");

    const result = await client.callTool({ name: "capsule_get", arguments: { name: "api" } });
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(text).toContain("auto-refreshed");
    expect(text).toContain("# API Capsule");
  });

  it("capsule_get returns error for missing capsule", async () => {
    await setupFixture();
    ({ server, client } = await createConnectedPair());

    const result = await client.callTool({ name: "capsule_get", arguments: { name: "nonexistent" } });
    expect(result.isError).toBe(true);
    expect((result.content as Array<{ text: string }>)[0].text).toContain("not found");
  });

  it("capsule_stale detects changes", async () => {
    await setupFixture();
    ({ server, client } = await createConnectedPair());
    await client.callTool({ name: "capsule_init" });

    const freshResult = await client.callTool({ name: "capsule_stale", arguments: { name: "api" } });
    const freshData = JSON.parse((freshResult.content as Array<{ text: string }>)[0].text);
    expect(freshData[0].fresh).toBe(true);

    await writeFile(join(root, "src/api/users.ts"), "export const users = ['changed'];", "utf8");

    const staleResult = await client.callTool({ name: "capsule_stale", arguments: { name: "api" } });
    const staleData = JSON.parse((staleResult.content as Array<{ text: string }>)[0].text);
    expect(staleData[0].fresh).toBe(false);
    expect(staleData[0].changed).toContain("src/api/users.ts");
    expect(staleData[0].staleTokens).toBeGreaterThan(0);
  });

  it("capsule_stats returns token savings", async () => {
    await setupFixture();
    ({ server, client } = await createConnectedPair());
    await client.callTool({ name: "capsule_init" });

    const result = await client.callTool({ name: "capsule_stats" });
    const stats = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(stats.capsules.length).toBeGreaterThan(0);
    expect(stats.totalSourceTokens).toBeGreaterThan(0);
    expect(typeof stats.totalSavingsPercent).toBe("number");
  });
});
