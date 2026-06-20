#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

import { printAutomergeDocumentList } from './src/automerge-list-print.js';

const usage = `Usage: automerge-list.js <DXOS.sqlite> [--json]

Lists automerge document ids sorted by combined chunk size (largest first).

Examples:
  node automerge-list.js /tmp/composer-forensics/main.composer.space/DXOS.sqlite
  node automerge-list.js /tmp/composer-forensics/main.composer.space/DXOS.sqlite --json
`;

const main = () => {
  const [, , dbPath, ...rest] = process.argv;
  if (!dbPath || dbPath === '--help' || dbPath === '-h') {
    console.log(usage);
    process.exit(dbPath ? 0 : 1);
  }

  try {
    printAutomergeDocumentList(dbPath, { json: rest.includes('--json') });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

main();
