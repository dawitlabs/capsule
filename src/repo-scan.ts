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

const GROUPS: Array<Omit<SourceGroup, "files">> = [
  {
    name: "architecture",
    description: "Repository structure, docs, and high-level project shape.",
    sources: ["README*", "docs/**", "package.json", "pyproject.toml", "go.mod", "Cargo.toml"],
  },
  {
    name: "setup",
    description: "Local setup, scripts, dependencies, and runtime configuration.",
    sources: ["package.json", "package-lock.json", "pnpm-workspace.yaml", "yarn.lock", "docker-compose.yml", "Dockerfile", ".env.example"],
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

export async function listRepositoryFiles(rootDir: string): Promise<string[]> {
  const files = await fg(["**/*"], {
    cwd: rootDir,
    dot: true,
    onlyFiles: true,
    ignore: DEFAULT_IGNORE,
  });

  return files.sort();
}

export async function scanRepository(rootDir: string): Promise<SourceGroup[]> {
  const allFiles = new Set(await listRepositoryFiles(rootDir));
  const groups: SourceGroup[] = [];

  for (const group of GROUPS) {
    const matched = await fg(group.sources, {
      cwd: rootDir,
      dot: true,
      onlyFiles: true,
      ignore: DEFAULT_IGNORE,
    });

    const files = matched.filter((file) => allFiles.has(file)).sort();
    if (files.length > 0) {
      groups.push({ ...group, files });
    }
  }

  return groups;
}
