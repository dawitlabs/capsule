const MACHINE_OWNED = new Set(["## Purpose", "## Key Files", "## Agent Hints"]);

export function splitSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = body.split("\n");

  let currentKey: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (currentKey !== null) {
      // Trim trailing blank lines so join("\n\n") produces clean spacing.
      const text = buffer.join("\n").trimEnd();
      sections.set(currentKey, text);
    }
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flush();
      currentKey = line;
      buffer = [line];
    } else if (currentKey === null) {
      // preamble (# Title block) — only include non-blank lines
      if (line.trim() !== "") {
        const preamble = sections.get("") ?? "";
        sections.set("", preamble ? `${preamble}\n${line}` : line);
      }
    } else {
      buffer.push(line);
    }
  }

  flush();
  return sections;
}

export function mergeCapsuleBody(freshBody: string, existingBody: string): string {
  const fresh = splitSections(freshBody);
  const existing = splitSections(existingBody);

  const parts: string[] = [];

  // preamble from fresh (title line)
  const preamble = fresh.get("") ?? existing.get("") ?? "";
  if (preamble) parts.push(preamble);

  // walk fresh sections as the spine — machine-owned take fresh, rest take existing
  for (const [heading, freshSection] of fresh) {
    if (heading === "") continue;
    if (MACHINE_OWNED.has(heading)) {
      parts.push(freshSection);
    } else {
      parts.push(existing.get(heading) ?? freshSection);
    }
  }

  // append any human-only sections from existing that aren't in the fresh spine
  for (const [heading, existingSection] of existing) {
    if (heading === "") continue;
    if (!fresh.has(heading)) {
      parts.push(existingSection);
    }
  }

  return `${parts.join("\n\n").trimEnd()}\n`;
}
