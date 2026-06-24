import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import { readCapsule } from "../capsule-format.js";
import { writeGroupCapsule } from "../capsule-write.js";
import { countFileTokens, estimateCapsuleSavings } from "../estimate.js";
import { compareFingerprints, computeFingerprints } from "../fingerprint.js";
import { loadConfig, scanRepository } from "../repo-scan.js";
import { renderIndex } from "../templates.js";

export function registerTools(server: McpServer, rootDir: string): void {
  server.registerTool(
    "capsule_list",
    {
      description: "List all capsules with freshness status",
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      const config = await loadConfig(rootDir);
      const groups = await scanRepository(rootDir);
      const items: Array<{
        name: string;
        description: string;
        files: number;
        status: string;
      }> = [];

      for (const group of groups) {
        let status = "not generated";
        try {
          const capsule = await readCapsule(rootDir, group.name);
          const current = await computeFingerprints(rootDir, capsule.frontmatter.sources, config.ignore);
          const result = compareFingerprints(group.name, capsule.frontmatter.fingerprints, current);
          status = result.fresh ? "fresh" : `stale (${result.changed.length + result.added.length} changed)`;
        } catch {
          // capsule file doesn't exist yet
        }
        items.push({
          name: group.name,
          description: group.description,
          files: group.files.length,
          status,
        });
      }

      return { content: [{ type: "text" as const, text: JSON.stringify(items, null, 2) }] };
    },
  );

  server.registerTool(
    "capsule_get",
    {
      description: "Read a capsule's compressed context (replaces reading raw source files)",
      inputSchema: { name: z.string().describe("Capsule name, e.g. 'architecture', 'api'") },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ name }) => {
      try {
        const capsule = await readCapsule(rootDir, name);
        return { content: [{ type: "text" as const, text: capsule.body.trim() }] };
      } catch {
        return {
          content: [
            { type: "text" as const, text: `Capsule "${name}" not found. Run capsule_list to see available capsules.` },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "capsule_stale",
    {
      description: "Check which capsules have outdated source fingerprints",
      inputSchema: { name: z.string().optional().describe("Check a specific capsule, or omit to check all") },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ name }) => {
      const config = await loadConfig(rootDir);
      const groups = await scanRepository(rootDir);
      const names = name ? [name] : groups.map((g) => g.name);
      const results: Array<{
        name: string;
        fresh: boolean;
        changed: string[];
        added: string[];
        missing: string[];
        staleTokens?: number;
      }> = [];

      for (const capsuleName of names) {
        try {
          const capsule = await readCapsule(rootDir, capsuleName);
          const current = await computeFingerprints(rootDir, capsule.frontmatter.sources, config.ignore);
          const result = compareFingerprints(capsuleName, capsule.frontmatter.fingerprints, current);
          let staleTokens: number | undefined;
          if (!result.fresh) {
            const staleFiles = [...result.changed, ...result.added].sort();
            staleTokens = await countFileTokens(rootDir, staleFiles);
          }
          results.push({ ...result, staleTokens });
        } catch {
          results.push({
            name: capsuleName,
            fresh: false,
            changed: [],
            added: [],
            missing: [],
            staleTokens: undefined,
          });
        }
      }

      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    },
  );

  server.registerTool(
    "capsule_stats",
    {
      description: "Show token savings: source tokens vs capsule tokens per capsule",
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      const config = await loadConfig(rootDir);
      const groups = await scanRepository(rootDir);
      const entries: Array<{
        name: string;
        sourceFiles: number;
        sourceTokens: number;
        capsuleTokens: number;
        savingsPercent: number;
        staleFiles: number;
      }> = [];

      for (const group of groups) {
        try {
          const capsule = await readCapsule(rootDir, group.name);
          const current = await computeFingerprints(rootDir, capsule.frontmatter.sources, config.ignore);
          const stale = compareFingerprints(group.name, capsule.frontmatter.fingerprints, current);
          const staleFiles = [...stale.changed, ...stale.added].sort();
          const sourceFiles = Object.keys(current).sort();
          const estimate = await estimateCapsuleSavings(rootDir, {
            capsulePath: `.capsules/${group.name}.md`,
            sourceFiles,
            staleFiles,
          });
          entries.push({
            name: group.name,
            sourceFiles: estimate.sourceFiles,
            sourceTokens: estimate.withoutCapsuleTokens,
            capsuleTokens: estimate.withCapsuleTokens,
            savingsPercent: estimate.savingsPercent,
            staleFiles: estimate.staleFiles,
          });
        } catch {
          // capsule not yet written
        }
      }

      const totalSource = entries.reduce((sum, e) => sum + e.sourceTokens, 0);
      const totalCapsule = entries.reduce((sum, e) => sum + e.capsuleTokens, 0);
      const totalSavings = totalSource === 0 ? 0 : Math.round(((totalSource - totalCapsule) / totalSource) * 100);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                capsules: entries,
                totalSourceTokens: totalSource,
                totalCapsuleTokens: totalCapsule,
                totalSavingsPercent: totalSavings,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "capsule_init",
    {
      description: "Generate capsules for this repository (static analysis only, no AI enrichment)",
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async () => {
      const groups = await scanRepository(rootDir);
      for (const group of groups) {
        await writeGroupCapsule(rootDir, group);
      }
      await writeFile(join(rootDir, ".capsules", "index.md"), renderIndex(groups), "utf8");
      return {
        content: [
          {
            type: "text" as const,
            text: `Created ${groups.length} capsules: ${groups.map((g) => g.name).join(", ")}`,
          },
        ],
      };
    },
  );
}
