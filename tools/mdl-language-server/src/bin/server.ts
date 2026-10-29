//
// Copyright 2026 DXOS.org
//

import { ProposedFeatures, createConnection } from 'vscode-languageserver/node';

import { startServer } from '../server.ts';

// Stdio by default; a client may also pass `--node-ipc` or `--socket=<port>`, which `createConnection` reads from argv.
if (
  !process.argv.some((arg) => arg.startsWith('--node-ipc') || arg.startsWith('--socket') || arg.startsWith('--pipe'))
) {
  process.argv.push('--stdio');
}

startServer(createConnection(ProposedFeatures.all));
