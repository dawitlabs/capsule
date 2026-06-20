#!/usr/bin/env node
import("../dist/cli.js").then(({ runCli }) => runCli()).catch((e) => {
  process.stderr.write((e instanceof Error ? e.message : String(e)) + "\n");
  process.exitCode = 1;
});
