import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readCapsule } from "../capsule-format.js";
import { scanRepository } from "../repo-scan.js";

export function registerResources(server: McpServer, rootDir: string): void {
  server.registerResource(
    "capsule-index",
    "capsule:///index",
    {
      description: "Capsule index listing all available context packs",
      mimeType: "text/markdown",
    },
    async (uri) => {
      try {
        const content = await readFile(join(rootDir, ".capsules", "index.md"), "utf8");
        return { contents: [{ uri: uri.href, text: content, mimeType: "text/markdown" }] };
      } catch {
        return { contents: [{ uri: uri.href, text: "No capsules generated yet. Use the capsule_init tool first." }] };
      }
    },
  );

  server.registerResource(
    "capsule",
    new ResourceTemplate("capsule:///{name}", {
      list: async () => {
        const groups = await scanRepository(rootDir);
        return {
          resources: groups.map((g) => ({
            uri: `capsule:///${g.name}`,
            name: g.name,
            description: g.description,
            mimeType: "text/markdown" as const,
          })),
        };
      },
      complete: {
        name: async (value) => {
          const groups = await scanRepository(rootDir);
          return groups.map((g) => g.name).filter((n) => n.startsWith(value));
        },
      },
    }),
    {
      description: "Individual capsule context pack",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const name = Array.isArray(variables.name) ? variables.name[0] : variables.name;
      try {
        const capsule = await readCapsule(rootDir, name);
        return { contents: [{ uri: uri.href, text: capsule.body.trim(), mimeType: "text/markdown" }] };
      } catch {
        return { contents: [{ uri: uri.href, text: `Capsule "${name}" not found.` }] };
      }
    },
  );
}
