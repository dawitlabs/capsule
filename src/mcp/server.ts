import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createMcpServer(version: string): McpServer {
  return new McpServer({ name: "capsule", version }, { capabilities: { resources: {}, tools: {} } });
}
