const EXPORT_FUNCTION_RE =
  /^export\s+(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*:\s*([^\n{]+))?\s*[{\n]/gm;

const EXPORT_CONST_RE = /^export\s+(?:const|let)\s+(\w+)(?:\s*:\s*([^\n=]+?))?\s*=/gm;

const EXPORT_CLASS_RE = /^export\s+(?:abstract\s+)?class\s+(\w+)(?:\s+(?:extends|implements)\s+([^\n{]+))?\s*\{/gm;

const EXPORT_TYPE_RE = /^export\s+(?:type|interface)\s+(\w+)(?:<[^>]*>)?(?:\s*=\s*([^\n;]+))?/gm;

export interface ExportedSignature {
  kind: "function" | "const" | "class" | "type";
  name: string;
  signature: string;
}

function cleanParams(raw: string): string {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractExports(content: string): ExportedSignature[] {
  const results: ExportedSignature[] = [];
  const seen = new Set<string>();

  for (const m of content.matchAll(EXPORT_FUNCTION_RE)) {
    const name = m[1];
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const params = cleanParams(m[2] ?? "");
    const returnType = m[3]?.trim() ?? "void";
    results.push({
      kind: "function",
      name,
      signature: `${name}(${params}): ${returnType}`,
    });
  }

  for (const m of content.matchAll(EXPORT_CONST_RE)) {
    const name = m[1];
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const type = m[2]?.trim();
    results.push({
      kind: "const",
      name,
      signature: type ? `${name}: ${type}` : name,
    });
  }

  for (const m of content.matchAll(EXPORT_CLASS_RE)) {
    const name = m[1];
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const ext = m[2]?.trim();
    results.push({
      kind: "class",
      name,
      signature: ext ? `class ${name} extends ${ext}` : `class ${name}`,
    });
  }

  for (const m of content.matchAll(EXPORT_TYPE_RE)) {
    const name = m[1];
    if (!name || seen.has(name)) continue;
    seen.add(name);
    results.push({
      kind: "type",
      name,
      signature: `type ${name}`,
    });
  }

  return results;
}

export function formatSignatures(filePath: string, exports: ExportedSignature[]): string {
  if (exports.length === 0) return "";
  const fns = exports.filter((e) => e.kind === "function");
  const types = exports.filter((e) => e.kind === "type");
  const consts = exports.filter((e) => e.kind === "const");
  const classes = exports.filter((e) => e.kind === "class");

  const parts: string[] = [];
  for (const f of fns) parts.push(f.signature);
  for (const c of classes) parts.push(c.signature);
  for (const t of types) parts.push(t.name);
  for (const c of consts) parts.push(c.signature);

  return `- \`${filePath}\`: ${parts.join(", ")}`;
}
