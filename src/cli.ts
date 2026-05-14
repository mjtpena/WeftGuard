#!/usr/bin/env node
import { runPreflightCli } from './cli/preflightCli';

runPreflightCli(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`WeftGuard: ${message}\n`);
  process.exitCode = 2;
});
