#!/usr/bin/env node
// Generates docs/demo.gif from SVG frames via rsvg-convert + ffmpeg.
// Requirements: rsvg-convert (librsvg package), ffmpeg
// Usage: node scripts/build-demo.mjs  |  npm run demo

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const FRAMES_DIR = join(ROOT, "docs", ".frames");
const OUT_GIF = join(ROOT, "docs", "demo.gif");

// ── Design tokens ──────────────────────────────────────────────────────────────
const W = 1480;
const H = 840;
const TITLE_H = 54;
const PAD_X = 52;
const PAD_Y = TITLE_H + 38;
const FS = 28; // font size
const LH = 43; // line height
const MAX_LINES = Math.floor((H - PAD_Y - 24) / LH); // ~17

const BG = "#0a0a0a";
const TEXT = "#ededed";
const DIM = "#555555";
const ACCENT = "#7c9cbf";
const CHROME = "#161616";
const DOT = "#353535";
const FONT = "'DejaVu Sans Mono', monospace";

// ── SVG ────────────────────────────────────────────────────────────────────────
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function makeSVG(lines, cursor) {
  const visible = lines.slice(-MAX_LINES);
  const rows = visible.map(({ text, color }, i) => {
    const y = PAD_Y + i * LH;
    const t = esc(cursor && i === visible.length - 1 ? `${text}█` : text);
    return `  <text x="${PAD_X}" y="${y}" font-family="${FONT}" font-size="${FS}" fill="${color}" xml:space="preserve">${t}</text>`;
  });
  const cy = TITLE_H >> 1;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect width="${W}" height="${TITLE_H}" fill="${CHROME}"/>
  <circle cx="30" cy="${cy}" r="7" fill="${DOT}"/>
  <circle cx="56" cy="${cy}" r="7" fill="${DOT}"/>
  <circle cx="82" cy="${cy}" r="7" fill="${DOT}"/>
  <text x="${W >> 1}" y="${cy + 6}" font-family="${FONT}" font-size="16" fill="${DIM}" text-anchor="middle" letter-spacing="3">capsule</text>
${rows.join("\n")}
</svg>`;
}

// ── Storyboard ─────────────────────────────────────────────────────────────────
function buildFrames() {
  const frames = []; // [{lines, cursor}]
  const buffer = []; // committed lines
  let input = ""; // current line being typed
  let atPrompt = true;

  const PROMPT = "$ ";

  function snap(cur) {
    const lines = [...buffer];
    if (atPrompt) lines.push({ text: PROMPT + input, color: TEXT });
    frames.push({ lines: lines.map((l) => ({ ...l })), cursor: cur ?? atPrompt });
  }

  function hold(n) {
    for (let i = 0; i < n; i++) snap(false);
  }

  function type(cmd) {
    input = "";
    for (const ch of cmd) {
      input += ch;
      snap(true);
      if (ch === " ") snap(true); // tiny beat at word boundaries
    }
    hold(4);
  }

  function run() {
    buffer.push({ text: PROMPT + input, color: DIM });
    input = "";
    atPrompt = false;
    hold(3);
  }

  function out(text, color, pause = 2) {
    buffer.push({ text, color });
    hold(pause);
  }

  function blank(n = 2) {
    out("", DIM, n);
  }

  function nextPrompt(n = 4) {
    atPrompt = true;
    input = "";
    hold(n);
  }

  // ── Scene 1: capsulectx init ───────────────────────────────────────────────
  hold(6);
  type("npx capsulectx init");
  run();
  out("Creating .capsules…", DIM, 3);
  out("  ✦ architecture   setup   api", DIM, 2);
  out("  ✦ data   ui   testing   deployment", DIM, 2);
  out("", DIM, 1);
  out("Created .capsules with 7 capsules", TEXT, 5);
  blank(4);
  nextPrompt(4);

  // ── Scene 2: capsule estimate architecture ────────────────────────────────
  type("capsule estimate architecture");
  run();
  out("Capsule: architecture", DIM, 3);
  blank(2);
  out("Without Capsule:", DIM, 2);
  out("  files: 5", TEXT, 2);
  out("  estimated tokens: 9,607", TEXT, 3);
  blank(2);
  out("With Capsule:", DIM, 2);
  out("  capsule plus stale files: 1", TEXT, 2);
  out("  stale source files: 0", TEXT, 2);
  out("  estimated tokens: 417", TEXT, 3);
  blank(2);
  out("Estimated discovery savings: 96%", ACCENT, 3);

  // Final hold — long pause on the accent line
  const last = JSON.parse(JSON.stringify(frames.at(-1)));
  for (let i = 0; i < 40; i++) frames.push(last);

  return frames;
}

// ── Render ─────────────────────────────────────────────────────────────────────
async function main() {
  if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true });
  mkdirSync(FRAMES_DIR, { recursive: true });
  mkdirSync(dirname(OUT_GIF), { recursive: true });

  const frameList = buildFrames();
  const total = frameList.length;
  console.log(`Generating ${total} frames…`);

  for (let i = 0; i < total; i++) {
    const { lines, cursor } = frameList[i];
    const n = String(i).padStart(4, "0");
    const svg = join(FRAMES_DIR, `frame${n}.svg`);
    const png = join(FRAMES_DIR, `frame${n}.png`);
    writeFileSync(svg, makeSVG(lines, cursor), "utf8");
    execSync(`rsvg-convert -w ${W >> 1} "${svg}" -o "${png}"`);
    if (i % 25 === 0 || i === total - 1) process.stdout.write(`  ${i + 1}/${total}\n`);
  }

  const palette = join(FRAMES_DIR, "palette.png");
  console.log("Building palette…");
  execSync(
    `ffmpeg -y -framerate 10 -i "${FRAMES_DIR}/frame%04d.png"` + ` -vf "palettegen=stats_mode=diff" "${palette}"`,
    { stdio: "pipe" },
  );

  console.log("Assembling GIF…");
  execSync(
    `ffmpeg -y -framerate 10 -i "${FRAMES_DIR}/frame%04d.png" -i "${palette}"` +
      ` -lavfi "fps=10[v];[v][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "${OUT_GIF}"`,
    { stdio: "pipe" },
  );

  const kb = Math.round(statSync(OUT_GIF).size / 1024);
  console.log(`\ndone → docs/demo.gif (${kb} KB, ${total} frames @ 10fps)`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exitCode = 1;
});
