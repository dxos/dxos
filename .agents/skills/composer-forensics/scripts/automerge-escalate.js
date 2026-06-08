#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

import { writeEscalationBundle } from './src/automerge-escalate.js';
import { findLargestDocumentId } from './src/automerge-load.js';

const usage = `Usage: automerge-escalate.js <DXOS.sqlite> <document-id|--largest> [--out-dir /tmp/...] [--fast]

Build an escalation bundle for Automerge maintainers:
  - <document-id>.bin       merged snapshot + incremental bytes
  - <document-id>-report.md stats, mutation breakdown, reproduction steps

Options:
  --out-dir <path>   Output directory (default: /tmp/composer-forensics/escalation)
  --fast             Skip full change decode (faster; report omits op action breakdown)

Examples:
  node automerge-escalate.js /tmp/.../DXOS.sqlite --largest
  node automerge-escalate.js /tmp/.../DXOS.sqlite 2DWmBh837zCBGPFZheCWBH1KFMRL --out-dir /tmp/am-escalation
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

  if (documentArg === '--largest' || documentArg === undefined) {
    console.error(`Escalating largest document: ${documentId}\n`);
  }

  const outDirIndex = rest.indexOf('--out-dir');
  const outDir = outDirIndex >= 0 ? rest[outDirIndex + 1] : undefined;
  const skipChangeOps = rest.includes('--fast');

  try {
    writeEscalationBundle(dbPath, documentId, { outDir, skipChangeOps });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

main();
