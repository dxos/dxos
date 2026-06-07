//
// Copyright 2026 DXOS.org
//

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { analyzeDocumentSizes, printSizeComparison } from './automerge-size.js';

/**
 * @param {string} dbPath
 * @param {string} documentId
 * @param {{ outDir?: string, pretty?: boolean, quiet?: boolean }} [options]
 */
export const dumpDocument = (dbPath, documentId, options = {}) => {
  const analysis = analyzeDocumentSizes(dbPath, documentId);

  const outDir = options.outDir ?? '/tmp/composer-forensics';
  const binPath = join(outDir, `${documentId}.bin`);
  const jsonPath = join(outDir, `${documentId}.json`);

  writeFileSync(binPath, analysis.merged);

  const json = options.pretty ? JSON.stringify(analysis.value, null, 2) : JSON.stringify(analysis.value);
  writeFileSync(jsonPath, json, 'utf8');
  const jsonBytes = Buffer.byteLength(json, 'utf8');

  const result = {
    ...analysis,
    binPath,
    jsonPath,
    jsonBytes,
    binToJsonRatio: jsonBytes > 0 ? analysis.combinedBytes / jsonBytes : analysis.binToJsonRatio,
    jsonToBinRatio: analysis.combinedBytes > 0 ? jsonBytes / analysis.combinedBytes : analysis.jsonToBinRatio,
  };

  if (!options.quiet) {
    printSizeComparison(result);
    console.log('');
    console.log('Wrote files');
    console.log(`  ${binPath}`);
    console.log(`  ${jsonPath}`);
  }

  return result;
};

/** @deprecated Use dumpDocument. */
export const dumpDocumentToJson = dumpDocument;

/**
 * @param {string} dbPath
 * @param {string} documentId
 * @param {{ outDir?: string, pretty?: boolean }} [options]
 */
export const printDumpDocument = (dbPath, documentId, options = {}) => {
  const result = dumpDocument(dbPath, documentId, options);
  console.log(result.jsonPath);
  console.log(result.binPath);
};

/** @deprecated Use printDumpDocument. */
export const printDumpDocumentToJson = printDumpDocument;
