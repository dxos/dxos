#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

import { analyzeDocumentSizes, printSizeComparison } from './src/automerge-size.js';
import { analyzeMutations, printMutationAnalysis } from './src/automerge-mutations.js';
import { openDatabase } from './src/db.js';
import { findLargestDocumentId } from './src/automerge-load.js';

const usage = `Usage: automerge-inspect.js <DXOS.sqlite> <document-id|--largest> [--json] [--mutations]

Compare combined automerge binary size (merged chunks) vs reified JSON size.
Use when debugging slow document loads — high binary/JSON ratio or ops/MiB flags bloat.

  --mutations   Decode all changes and show op action breakdown (~1 min on large docs)

Examples:
  node automerge-inspect.js /tmp/.../DXOS.sqlite --largest
  node automerge-inspect.js /tmp/.../DXOS.sqlite 2DWmBh837zCBGPFZheCWBH1KFMRL --mutations
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
    console.error(`Inspecting largest document: ${documentId}\n`);
  }

  try {
    const analysis = analyzeDocumentSizes(dbPath, documentId);
    if (rest.includes('--json')) {
      const payload = { ...analysis };
      delete payload.merged;
      delete payload.value;
      console.log(JSON.stringify(payload, null, 2));
      return;
    }
    printSizeComparison(analysis);

    if (rest.includes('--mutations')) {
      console.log('');
      const db = openDatabase(dbPath);
      const mutations = analyzeMutations(db, documentId, analysis.merged);
      printMutationAnalysis(mutations);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

main();
