#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

import { printDumpDocument } from './src/automerge-dump.js';
import { findLargestDocumentId } from './src/automerge-load.js';

const usage = `Usage: automerge-dump-json.js <DXOS.sqlite> <document-id|--largest> [--pretty] [--out-dir /tmp]

Loads an automerge document from SQLite chunks and writes:
  - <document-id>.bin  merged snapshot + incremental chunk bytes (StorageSubsystem order)
  - <document-id>.json Automerge.toJS() output

Examples:
  node automerge-dump-json.js /tmp/.../DXOS.sqlite --largest --out-dir /tmp
  node automerge-dump-json.js /tmp/.../DXOS.sqlite 2DWmBh837zCBGPFZheCWBH1KFMRL --pretty
`;

const main = () => {
  const [, , dbPath, documentArg, ...rest] = process.argv;
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

  const outDirIndex = rest.indexOf('--out-dir');
  const outDir = outDirIndex >= 0 ? rest[outDirIndex + 1] : '/tmp/composer-forensics';
  const pretty = rest.includes('--pretty');

  try {
    printDumpDocument(dbPath, documentId, { outDir, pretty });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

main();
