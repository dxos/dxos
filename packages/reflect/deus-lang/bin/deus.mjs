#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Runs from source: node strips the kernel's types, so no build step is needed.
import { dirname } from 'node:path';

import { main } from '../src/kernel/main.ts';

// `deus build` finds the kernel sources and the node binary through these.
process.env.DEUS_HOME ??= dirname(import.meta.dirname);
process.env.DEUS_NODE ??= process.execPath;
// DEUS code has no isatty; this tells the CLI it may colour its output.
if (process.stdout.isTTY) {
  process.env.DEUS_TTY ??= '1';
}

process.exitCode = main(process.argv.slice(2));
