import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Tiktoken } from "js-tiktoken";
import { encodingForModel } from "js-tiktoken";

let encoder: Tiktoken | null = null;

function getEncoder(): Tiktoken {
  if (!encoder) encoder = encodingForModel("gpt-4o");
  return encoder;
}

export interface EstimateInput {
  capsulePath: string;
  sourceFiles: string[];
  staleFiles: string[];
}

export interface EstimateResult {
  sourceFiles: number;
  staleFiles: number;
  withoutCapsuleTokens: number;
  withCapsuleTokens: number;
  savingsPercent: number;
}

export interface CapsuleStatEntry {
  name: string;
  sourceFiles: number;
  sourceTokens: number;
  capsuleTokens: number;
  savingsPercent: number;
  staleFiles: number;
}

export interface CapsuleStats {
  capsules: CapsuleStatEntry[];
  totalSourceTokens: number;
  totalCapsuleTokens: number;
  totalSavingsPercent: number;
}

export function countTokens(text: string): number {
  return getEncoder().encode(text).length;
}

export async function countFileTokens(rootDir: string, files: string[]): Promise<number> {
  let total = 0;
  for (const file of files) {
    const content = await readFile(join(rootDir, file), "utf8");
    total += countTokens(content);
  }
  return total;
}

export async function estimateCapsuleSavings(rootDir: string, input: EstimateInput): Promise<EstimateResult> {
  const withoutCapsuleTokens = await countFileTokens(rootDir, input.sourceFiles);
  const capsuleTokens = await countFileTokens(rootDir, [input.capsulePath]);
  const staleTokens = await countFileTokens(rootDir, input.staleFiles);

  const withCapsuleTokens = capsuleTokens + staleTokens;
  const savingsPercent =
    withoutCapsuleTokens === 0
      ? 0
      : Math.max(0, Math.round(((withoutCapsuleTokens - withCapsuleTokens) / withoutCapsuleTokens) * 100));

  return {
    sourceFiles: input.sourceFiles.length,
    staleFiles: input.staleFiles.length,
    withoutCapsuleTokens,
    withCapsuleTokens,
    savingsPercent,
  };
}
