import { readFile } from "node:fs/promises";
import { join } from "node:path";

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

export async function estimateCapsuleSavings(rootDir: string, input: EstimateInput): Promise<EstimateResult> {
  const sourceChars = await sumChars(rootDir, input.sourceFiles);
  const capsuleChars = await sumChars(rootDir, [input.capsulePath]);
  const staleChars = await sumChars(rootDir, input.staleFiles);

  const withoutCapsuleTokens = estimateTokens(sourceChars);
  const withCapsuleTokens = estimateTokens(capsuleChars + staleChars);
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

export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

async function sumChars(rootDir: string, files: string[]): Promise<number> {
  let total = 0;

  for (const file of files) {
    const content = await readFile(join(rootDir, file), "utf8");
    total += content.length;
  }

  return total;
}
