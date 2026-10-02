//
// Copyright 2026 DXOS.org
//

import { runAgentHelper } from '../agent-helper/sidecar.ts';

// Entry point of the compiled `dx-agent` helper the desktop app bundles.
await runAgentHelper({ input: process.stdin, output: process.stdout, env: process.env });
process.exit(0);
