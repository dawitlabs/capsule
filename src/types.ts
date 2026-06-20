export type CapsuleName =
  | "architecture"
  | "setup"
  | "api"
  | "data"
  | "ui"
  | "testing"
  | "deployment"
  | string;

export interface CapsuleFrontmatter {
  name: CapsuleName;
  description: string;
  sources: string[];
  fingerprints: Record<string, string>;
  updated_at: string;
}

export interface CapsuleFile {
  frontmatter: CapsuleFrontmatter;
  body: string;
  path: string;
  raw?: string;
}

export interface SourceGroup {
  name: CapsuleName;
  description: string;
  sources: string[];
  files: string[];
}

export interface StaleResult {
  name: CapsuleName;
  fresh: boolean;
  changed: string[];
  missing: string[];
  added: string[];
}
