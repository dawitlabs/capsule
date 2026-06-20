import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";

export interface ExtractedContent {
  keyFiles: string[];
  conventions: string[];
  decisions: string[];
}

const MAX_BYTES = 8_000;

async function readHead(path: string): Promise<string> {
  try {
    const buf = await readFile(path);
    return buf.subarray(0, MAX_BYTES).toString("utf8");
  } catch {
    return "";
  }
}

function extractNamedExports(content: string): string[] {
  const names: string[] = [];
  const patterns = [
    /^export\s+(?:async\s+)?function\s+(\w+)/gm,
    /^export\s+(?:const|let)\s+(\w+)/gm,
    /^export\s+class\s+(\w+)/gm,
    /^export\s+(?:type|interface)\s+(\w+)/gm,
  ];
  for (const re of patterns) {
    for (const m of content.matchAll(re)) {
      if (m[1] && !names.includes(m[1])) names.push(m[1]);
    }
  }
  return names.slice(0, 5);
}

function extractDrizzleTables(content: string): string[] {
  const tables: string[] = [];
  for (const m of content.matchAll(/export\s+const\s+(\w+)\s*=\s*(?:pgTable|sqliteTable|mysqlTable)/g)) {
    if (m[1]) tables.push(m[1]);
  }
  return tables.slice(0, 6);
}

function extractPrismaModels(content: string): string[] {
  const models: string[] = [];
  for (const m of content.matchAll(/^model\s+(\w+)\s*\{/gm)) {
    if (m[1]) models.push(m[1]);
  }
  return models.slice(0, 6);
}

function extractRoutes(content: string): string[] {
  const routes: string[] = [];

  for (const m of content.matchAll(/(?:router|app|r)\.(get|post|put|patch|delete)\(['"`](.*?)['"`]/gi)) {
    if (m[1] && m[2]) routes.push(`${m[1].toUpperCase()} ${m[2]}`);
  }
  for (const m of content.matchAll(/^export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)/gm)) {
    if (m[1]) routes.push(m[1]);
  }
  if (/export\s+const\s+actions\s*=/.test(content)) routes.push("form actions");
  if (/export\s+(?:async\s+)?function\s+load/.test(content)) routes.push("load function");

  return [...new Set(routes)].slice(0, 4);
}

const NAMED_FILES: Record<string, string> = {
  "tsconfig.json": "TypeScript compiler configuration",
  "tsconfig.base.json": "shared TypeScript base configuration",
  ".env.example": "required environment variable definitions",
  ".env.local.example": "required local environment variable definitions",
  "biome.json": "Biome linter and formatter configuration",
  "drizzle.config.ts": "Drizzle ORM migration configuration",
  "vite.config.ts": "Vite build configuration",
  "vite.config.js": "Vite build configuration",
  "next.config.ts": "Next.js configuration",
  "next.config.js": "Next.js configuration",
  "svelte.config.js": "SvelteKit configuration",
  "tailwind.config.ts": "Tailwind CSS configuration",
  "vitest.config.ts": "Vitest test runner configuration",
  "jest.config.ts": "Jest test runner configuration",
  "jest.config.js": "Jest test runner configuration",
  "docker-compose.yml": "Docker Compose service definitions",
  "docker-compose.yaml": "Docker Compose service definitions",
  Dockerfile: "Docker container build instructions",
  "vercel.json": "Vercel deployment configuration",
  "netlify.toml": "Netlify deployment configuration",
  "fly.toml": "Fly.io deployment configuration",
};

function describeFile(filePath: string, content: string): string {
  const name = basename(filePath);

  if (name === "package.json") {
    try {
      const pkg = JSON.parse(content) as { description?: string };
      return `project manifest${pkg.description ? ` — ${pkg.description}` : ""}`;
    } catch {
      return "project manifest";
    }
  }

  if (name === "README.md" || name === "readme.md") {
    const firstParagraph = content
      .split("\n")
      .find((l) => l.trim() && !l.startsWith("#"))
      ?.trim();
    return `project documentation${firstParagraph ? ` — ${firstParagraph.slice(0, 80)}` : ""}`;
  }

  if (NAMED_FILES[name]) return NAMED_FILES[name];

  const drizzleTables = extractDrizzleTables(content);
  if (drizzleTables.length > 0) return `Drizzle table definitions — ${drizzleTables.join(", ")}`;

  const prismaModels = extractPrismaModels(content);
  if (prismaModels.length > 0) return `Prisma schema — models: ${prismaModels.join(", ")}`;

  const routes = extractRoutes(content);
  if (routes.length > 0) return `route handlers — ${routes.slice(0, 2).join(", ")}`;

  const exports = extractNamedExports(content);
  if (exports.length > 0) return `exports ${exports.map((e) => `\`${e}\``).join(", ")}`;

  return "source module";
}

async function buildKeyFiles(root: string, files: string[]): Promise<string[]> {
  return Promise.all(
    files.slice(0, 12).map(async (file) => {
      const content = await readHead(join(root, file));
      const desc = describeFile(file, content);
      return `- \`${file}\`: ${desc}.`;
    }),
  );
}

function detectFramework(deps: Record<string, string>): string | null {
  if (deps.next) return "Next.js";
  if (deps["@sveltejs/kit"]) return "SvelteKit";
  if (deps.react) return "React";
  if (deps.vue) return "Vue";
  if (deps["solid-js"]) return "SolidJS";
  if (deps.astro) return "Astro";
  if (deps.nuxt) return "Nuxt";
  if (deps.express) return "Express.js";
  if (deps.fastify) return "Fastify";
  if (deps.hono) return "Hono";
  if (deps["@nestjs/core"]) return "NestJS";
  return null;
}

async function extractArchitectureContext(root: string): Promise<{ conventions: string[]; decisions: string[] }> {
  const conventions: string[] = [];
  const decisions: string[] = [];

  try {
    const raw = await readHead(join(root, "package.json"));
    const pkg = JSON.parse(raw) as {
      type?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const framework = detectFramework(deps);
    if (framework) decisions.push(`- ${framework} as the application framework.`);

    if (deps.typescript) conventions.push("- TypeScript — strict mode checked on every build.");
    if (pkg.type === "module") conventions.push(`- ESM modules (\`"type": "module"\` in package.json).`);

    if (deps["@biomejs/biome"]) {
      decisions.push("- Biome for linting and formatting — not ESLint or Prettier.");
    } else if (deps.eslint) {
      decisions.push("- ESLint for linting.");
    }

    if (deps["drizzle-orm"]) {
      decisions.push("- Drizzle ORM for type-safe database access.");
    } else if (deps["@prisma/client"]) {
      decisions.push("- Prisma ORM for database access.");
    }

    if (deps.vitest) {
      decisions.push("- Vitest as the test runner.");
    } else if (deps.jest) {
      decisions.push("- Jest as the test runner.");
    }
  } catch {
    // no package.json
  }

  return { conventions, decisions };
}

async function extractSetupContext(root: string): Promise<{ conventions: string[]; decisions: string[] }> {
  const conventions: string[] = [];
  const decisions: string[] = [];

  try {
    const raw = await readHead(join(root, "package.json"));
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };

    if (pkg.scripts) {
      const entries = Object.entries(pkg.scripts);
      if (entries.length > 0) {
        conventions.push("- Available scripts:");
        for (const [name, cmd] of entries.slice(0, 8)) {
          const shortCmd = cmd.length > 55 ? `${cmd.slice(0, 52)}...` : cmd;
          conventions.push(`  - \`${name}\`: \`${shortCmd}\``);
        }
      }
    }
  } catch {
    // no package.json
  }

  for (const envFile of [".env.example", ".env.local.example"]) {
    try {
      const raw = await readFile(join(root, envFile), "utf8");
      const vars = raw
        .split("\n")
        .filter((l) => /^[A-Z_]+=/.test(l.trim()))
        .map((l) => l.trim().split("=")[0]);

      if (vars.length > 0) {
        decisions.push(`- Required env vars (from \`${envFile}\`): ${vars.slice(0, 6).join(", ")}.`);
      }
      break;
    } catch {
      // file doesn't exist
    }
  }

  return { conventions, decisions };
}

async function extractApiContext(
  root: string,
  files: string[],
): Promise<{ conventions: string[]; decisions: string[] }> {
  const conventions: string[] = [];
  const decisions: string[] = [];
  const allRoutes: string[] = [];

  for (const file of files.slice(0, 8)) {
    const content = await readHead(join(root, file));
    allRoutes.push(...extractRoutes(content));
  }

  const unique = [...new Set(allRoutes)];
  if (unique.length > 0) {
    conventions.push(`- Detected endpoints: ${unique.slice(0, 4).join(", ")}.`);
  }

  return { conventions, decisions };
}

async function extractDataContext(
  root: string,
  files: string[],
): Promise<{ conventions: string[]; decisions: string[] }> {
  const conventions: string[] = [];
  const decisions: string[] = [];
  const allTables: string[] = [];
  const allModels: string[] = [];

  for (const file of files.slice(0, 6)) {
    const content = await readHead(join(root, file));
    allTables.push(...extractDrizzleTables(content));
    allModels.push(...extractPrismaModels(content));
  }

  const tables = [...new Set(allTables)];
  if (tables.length > 0) decisions.push(`- Drizzle ORM — tables: ${tables.slice(0, 6).join(", ")}.`);

  const models = [...new Set(allModels)];
  if (models.length > 0) decisions.push(`- Prisma schema — models: ${models.slice(0, 6).join(", ")}.`);

  return { conventions, decisions };
}

async function extractTestingContext(
  root: string,
  files: string[],
): Promise<{ conventions: string[]; decisions: string[] }> {
  const conventions: string[] = [];
  const decisions: string[] = [];

  try {
    const raw = await readHead(join(root, "package.json"));
    const pkg = JSON.parse(raw) as {
      devDependencies?: Record<string, string>;
      dependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps.vitest) decisions.push("- Vitest for unit and integration tests.");
    else if (deps.jest) decisions.push("- Jest for unit and integration tests.");
    if (deps["@playwright/test"]) decisions.push("- Playwright for end-to-end tests.");
    if (deps.cypress) decisions.push("- Cypress for end-to-end tests.");
  } catch {
    // no package.json
  }

  const testFiles = files.filter((f) => f.includes("test") || f.includes("spec"));
  if (testFiles.length > 0) {
    conventions.push(
      `- Test files use the pattern: ${testFiles
        .slice(0, 2)
        .map((f) => `\`${basename(f)}\``)
        .join(", ")}.`,
    );
  }

  return { conventions, decisions };
}

function extractDeploymentContext(files: string[]): { conventions: string[]; decisions: string[] } {
  const conventions: string[] = [];
  const decisions: string[] = [];

  const platforms: string[] = [];
  if (files.some((f) => f === "vercel.json")) platforms.push("Vercel");
  if (files.some((f) => f === "netlify.toml")) platforms.push("Netlify");
  if (files.some((f) => f === "fly.toml")) platforms.push("Fly.io");
  if (files.some((f) => f === "railway.json")) platforms.push("Railway");
  if (files.some((f) => f.startsWith(".github/workflows/"))) platforms.push("GitHub Actions CI");

  if (platforms.length > 0) decisions.push(`- Deployment platform: ${platforms.join(", ")}.`);
  if (files.some((f) => basename(f) === "Dockerfile"))
    conventions.push("- Docker container build defined in Dockerfile.");
  if (files.some((f) => basename(f).startsWith("docker-compose"))) {
    conventions.push("- Docker Compose defined for local or production services.");
  }

  return { conventions, decisions };
}

export async function extractGroupContent(root: string, groupName: string, files: string[]): Promise<ExtractedContent> {
  const keyFiles = await buildKeyFiles(root, files);

  let groupContext: { conventions: string[]; decisions: string[] };

  switch (groupName) {
    case "architecture":
      groupContext = await extractArchitectureContext(root);
      break;
    case "setup":
      groupContext = await extractSetupContext(root);
      break;
    case "api":
      groupContext = await extractApiContext(root, files);
      break;
    case "data":
      groupContext = await extractDataContext(root, files);
      break;
    case "testing":
      groupContext = await extractTestingContext(root, files);
      break;
    case "deployment":
      groupContext = extractDeploymentContext(files);
      break;
    default:
      groupContext = { conventions: [], decisions: [] };
  }

  return { keyFiles, ...groupContext };
}
