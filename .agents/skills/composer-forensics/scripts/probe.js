#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

import { printAutomergeDocumentList } from './src/automerge-list-print.js';
import { benchLoadDocument, findLargestDocumentId } from './src/automerge-load.js';
import { printProbeSummary } from './src/summary.js';

const usage = `Usage: probe.js <DXOS.sqlite> [command]

Commands:
  probe                         Profile summary (default)
  automerge list                Document ids sorted by combined chunk size
  automerge list --json         JSON output
  automerge list-ids            Alias for automerge list
  automerge bench-load <id>     Time loadIncremental for one document
  automerge bench-load --largest   Bench the largest document

Standalone scripts (same logic):
  automerge-list.js <db> [--json]
  automerge-bench-load.js <db> <document-id|--largest>

Examples:
  node probe.js /tmp/composer-forensics/main.composer.space/DXOS.sqlite
  node probe.js /tmp/.../DXOS.sqlite automerge list
  node probe.js /tmp/.../DXOS.sqlite automerge bench-load --largest

Requires Node.js 24+ (node:sqlite). Run from scripts/ after pnpm install.
`;

const main = () => {
  const [, , dbPath, command = 'probe', subcommand, ...rest] = process.argv;

  if (!dbPath || dbPath === '--help' || dbPath === '-h') {
    console.log(usage);
    process.exit(dbPath ? 0 : 1);
  }

  if (command === 'probe' || command === 'summary') {
    printProbeSummary(dbPath);
    return;
  }

  if (command === 'automerge' && (subcommand === 'list' || subcommand === 'list-ids')) {
    try {
      printAutomergeDocumentList(dbPath, { json: rest.includes('--json') });
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }

  if (command === 'automerge' && subcommand === 'bench-load') {
    const documentId = rest.includes('--largest') || rest.length === 0 ? findLargestDocumentId(dbPath) : rest[0];
    if (!documentId) {
      console.error('No automerge documents found');
      process.exit(1);
    }
    if (rest.includes('--largest') || rest.length === 0) {
      console.log(`Using largest document: ${documentId}\n`);
    }
    try {
      benchLoadDocument(dbPath, documentId);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }

  console.error(`Unknown command: ${command}${subcommand ? ` ${subcommand}` : ''}\n`);
  console.error(usage);
  process.exit(1);
};

main();
