#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

import { benchLoadDocument, findLargestDocumentId } from './src/automerge-load.js';

const usage = `Usage: automerge-bench-load.js <DXOS.sqlite> <document-id|--largest>

Loads all snapshot + incremental chunks for a document and times Automerge reconstruction.

Uses the same chunk order as automerge-repo StorageSubsystem.loadDoc:
  1. snapshot chunks (key order)
  2. incremental chunks (key order)

Reports:
  - merge-then-loadIncremental (what StorageSubsystem.loadDoc does)
  - per-chunk load / loadIncremental with per-chunk timings

Examples:
  node automerge-bench-load.js /tmp/.../DXOS.sqlite 2HKZUSyDKqnEhBgaKzuohxMZBRPY
  node automerge-bench-load.js /tmp/.../DXOS.sqlite --largest
`;

const main = () => {
  const [, , dbPath, documentArg] = process.argv;
  if (!dbPath || dbPath === '--help' || dbPath === '-h') {
    console.log(usage);
    process.exit(dbPath ? 0 : 1);
  }

  const documentId =
    documentArg === '--largest' || documentArg === undefined ? findLargestDocumentId(dbPath) : documentArg;

  if (!documentId) {
    console.error('No automerge documents found');
    process.exit(1);
  }

  if (documentArg === '--largest' || documentArg === undefined) {
    console.log(`Using largest document: ${documentId}\n`);
  }

  try {
    benchLoadDocument(dbPath, documentId);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

main();
