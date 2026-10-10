//
// Copyright 2026 DXOS.org
//

import { AGENT_FLAG, runAgent, runAgentHelper } from '../agent-helper/sidecar.ts';

// Entry point of the compiled `dx-agent` helper the desktop app bundles, and of the agents it starts.
if (process.argv.includes(AGENT_FLAG)) {
  await runAgent(process.argv);
} else {
  await runAgentHelper({ input: process.stdin, output: process.stdout, env: process.env });
  process.exit(0);
}
