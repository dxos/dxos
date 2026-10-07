//
// Copyright 2026 DXOS.org
//

import { runSidecar } from '../local/sidecar.ts';

// Entry point of the compiled `dx-sandbox` helper the desktop app bundles.
await runSidecar({ input: process.stdin, output: process.stdout, env: process.env });
process.exit(0);
