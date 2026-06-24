#!/usr/bin/env node
import { startMcpServer } from "../dist/mcp/index.js";

await startMcpServer({ rootDir: process.cwd() });
