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

process.exitCode = main(process.argv.slice(2));
