#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Runs from source: node strips the kernel's types, so no build step is needed.
import { main } from '../src/kernel/main.ts';

process.exitCode = main(process.argv.slice(2));
