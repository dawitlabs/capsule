import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerResources } from "./resources.js";
import { createMcpServer } from "./server.js";
import { registerTools } from "./tools.js";

export async function startMcpServer({ rootDir }: { rootDir: string }): Promise<void> {
  const pkg = JSON.parse(readFileSync(join(fileURLToPath(import.meta.url), "../../../package.json"), "utf8")) as {
    version: string;
  };

  const server = createMcpServer(pkg.version);
  registerTools(server, rootDir);
  registerResources(server, rootDir);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
