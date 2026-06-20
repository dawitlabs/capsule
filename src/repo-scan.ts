import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { SourceGroup } from "./types.js";

export const DEFAULT_IGNORE = [
  ".git/**",
  "**/.git/**",
  ".capsules/**",
  "**/.capsules/**",
  "node_modules/**",
  "**/node_modules/**",
  "dist/**",
  "**/dist/**",
  "build/**",
  "**/build/**",
  ".next/**",
  "**/.next/**",
  "coverage/**",
  "**/coverage/**",
  "tests/.tmp/**",
  "**/tests/.tmp/**",
  ".tmp/**",
  "**/.tmp/**",
  "tmp/**",
  "**/tmp/**",
  ".turbo/**",
  "**/.turbo/**",
  "target/**",
  "**/target/**",
  "vendor/**",
  "**/vendor/**",
  ".venv/**",
  "**/.venv/**",
  "__pycache__/**",
  "**/__pycache__/**",
];

const DEFAULT_GROUPS: Array<Omit<SourceGroup, "files">> = [
  {
    name: "architecture",
    description: "Repository structure, docs, and high-level project shape.",
    sources: ["README*", "docs/**", "package.json", "pyproject.toml", "go.mod", "Cargo.toml"],
  },
  {
    name: "setup",
    description: "Local setup, scripts, dependencies, and runtime configuration.",
    sources: [
      "package.json",
      "package-lock.json",
      "pnpm-workspace.yaml",
      "yarn.lock",
      "docker-compose.yml",
      "Dockerfile",
      ".env.example",
    ],
  },
  {
    name: "api",
    description: "Request handlers, routes, controllers, and service boundaries.",
    sources: ["src/api/**", "app/api/**", "routes/**", "controllers/**", "server/**"],
  },
  {
    name: "data",
    description: "Database schemas, migrations, models, repositories, and persistence.",
    sources: ["src/db/**", "db/**", "database/**", "migrations/**", "prisma/**", "drizzle/**", "models/**"],
  },
  {
    name: "ui",
    description: "User interface components, pages, screens, and styles.",
    sources: ["src/components/**", "components/**", "src/pages/**", "pages/**", "app/**", "src/app/**"],
  },
  {
    name: "testing",
    description: "Automated tests, fixtures, mocks, and quality gates.",
    sources: ["tests/**", "test/**", "__tests__/**", "e2e/**", "spec/**"],
  },
  {
    name: "deployment",
    description: "Deployment, CI, hosting, containers, and production runtime config.",
    sources: [".github/**", "vercel.json", "netlify.toml", "fly.toml", "Dockerfile", "docker-compose.yml"],
  },
];

export interface CapsuleConfig {
  groups: Array<{ name: string; description?: string; sources: string[] }>;
  ignore: string[];
}

export async function loadConfig(rootDir: string): Promise<CapsuleConfig> {
  const configPath = join(rootDir, ".capsules", "config.json");

  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    return { groups: [], ignore: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`.capsules/config.json is not valid JSON`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`.capsules/config.json must be a JSON object`);
  }

  const obj = parsed as Record<string, unknown>;
  const groups: CapsuleConfig["groups"] = [];
  const ignore: string[] = [];

  if (obj.groups !== undefined) {
    if (!Array.isArray(obj.groups)) {
      throw new Error(`.capsules/config.json: "groups" must be an array`);
    }
    for (const [i, g] of (obj.groups as unknown[]).entries()) {
      if (typeof g !== "object" || g === null || Array.isArray(g)) {
        throw new Error(`.capsules/config.json: groups[${i}] must be an object`);
      }
      const entry = g as Record<string, unknown>;
      if (typeof entry.name !== "string") {
        throw new Error(`.capsules/config.json: groups[${i}].name must be a string`);
      }
      if (!Array.isArray(entry.sources)) {
        throw new Error(`.capsules/config.json: groups[${i}].sources must be an array`);
      }
      groups.push({
        name: entry.name,
        description: typeof entry.description === "string" ? entry.description : "",
        sources: entry.sources as string[],
      });
    }
  }

  if (obj.ignore !== undefined) {
    if (!Array.isArray(obj.ignore)) {
      throw new Error(`.capsules/config.json: "ignore" must be an array`);
    }
    ignore.push(...(obj.ignore as string[]));
  }

  return { groups, ignore };
}

export async function listRepositoryFiles(rootDir: string, extraIgnore: string[] = []): Promise<string[]> {
  const files = await fg(["**/*"], {
    cwd: rootDir,
    dot: true,
    onlyFiles: true,
    ignore: [...DEFAULT_IGNORE, ...extraIgnore],
  });

  return files.sort();
}

export async function scanRepository(rootDir: string): Promise<SourceGroup[]> {
  const config = await loadConfig(rootDir);
  const ignore = [...DEFAULT_IGNORE, ...config.ignore];

  // Build merged group list: config overrides default by name, new names appended.
  const groupMap = new Map(DEFAULT_GROUPS.map((g) => [g.name, { ...g }]));
  for (const configGroup of config.groups) {
    groupMap.set(configGroup.name, {
      name: configGroup.name,
      description: configGroup.description ?? "",
      sources: configGroup.sources,
    });
  }
  const groupDefs = [...groupMap.values()];

  const allFiles = new Set(await listRepositoryFiles(rootDir, config.ignore));
  const groups: SourceGroup[] = [];

  for (const group of groupDefs) {
    const matched = await fg(group.sources, {
      cwd: rootDir,
      dot: true,
      onlyFiles: true,
      ignore,
    });

    const files = matched.filter((file) => allFiles.has(file)).sort();
    if (files.length > 0) {
      groups.push({ ...group, files });
    }
  }

  return groups;
}
