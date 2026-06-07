//
// Copyright 2026 DXOS.org
//

import { init, loadIncremental, stats, toJS } from '@automerge/automerge';

import { loadDocumentChunks, mergeArrays } from './automerge-chunks.js';
import { openDatabase, tableExists } from './db.js';
import { formatBytes, formatMs } from './format.js';

/**
 * Loads a document and measures combined binary vs reified JSON size.
 *
 * @param {string} dbPath
 * @param {string} documentId
 */
export const analyzeDocumentSizes = (dbPath, documentId) => {
  if (!tableExists(openDatabase(dbPath), 'automerge_chunks')) {
    throw new Error('automerge_chunks table not found');
  }

  const db = openDatabase(dbPath);
  const chunks = loadDocumentChunks(db, documentId);
  if (chunks.length === 0) {
    throw new Error(`No chunks found for document ${documentId}`);
  }

  const merged = mergeArrays(chunks.map((chunk) => chunk.data).filter((data) => data.length > 0));

  const loadStart = performance.now();
  const doc = loadIncremental(init(), merged);
  const loadMs = performance.now() - loadStart;
  const docStats = stats(doc);

  const toJsStart = performance.now();
  const value = toJS(doc);
  const toJsMs = performance.now() - toJsStart;

  const stringifyStart = performance.now();
  const json = JSON.stringify(value);
  const stringifyMs = performance.now() - stringifyStart;
  const jsonBytes = Buffer.byteLength(json, 'utf8');

  const objectMetaRows = Number(
    db.prepare('SELECT COUNT(*) AS n FROM objectMeta WHERE documentId = ?').get(documentId)?.n ?? 0,
  );

  const combinedBytes = merged.byteLength;
  const binToJsonRatio = jsonBytes > 0 ? combinedBytes / jsonBytes : Infinity;
  const jsonToBinRatio = combinedBytes > 0 ? jsonBytes / combinedBytes : Infinity;
  const opsPerMiB = combinedBytes > 0 ? (docStats.numOps ?? 0) / (combinedBytes / (1024 * 1024)) : 0;

  return {
    documentId,
    merged,
    value,
    chunkCount: chunks.length,
    snapshotCount: chunks.filter((chunk) => chunk.type === 'snapshot').length,
    incrementalCount: chunks.filter((chunk) => chunk.type === 'incremental').length,
    combinedBytes,
    jsonBytes,
    binToJsonRatio,
    jsonToBinRatio,
    numChanges: docStats.numChanges ?? 0,
    numOps: docStats.numOps ?? 0,
    numActors: docStats.numActors ?? 0,
    opsPerMiB,
    objectMetaRows,
    loadMs,
    toJsMs,
    stringifyMs,
  };
};

/**
 * @param {ReturnType<typeof analyzeDocumentSizes>} analysis
 */
export const printSizeComparison = (analysis) => {
  console.log('Automerge size comparison');
  console.log('=========================');
  console.log(`document_id:       ${analysis.documentId}`);
  console.log(`objectMeta rows:   ${analysis.objectMetaRows}`);
  console.log(
    `chunks:            ${analysis.chunkCount} (${analysis.snapshotCount} snapshots, ${analysis.incrementalCount} incrementals)`,
  );
  console.log('');
  console.log('Storage size (what loadIncremental reads)');
  console.log(
    `  combined binary: ${formatBytes(analysis.combinedBytes).padStart(10)}  merged snapshot + incremental bytes`,
  );
  console.log('Reified size (what the app sees after toJS + JSON.stringify)');
  console.log(`  JSON:            ${formatBytes(analysis.jsonBytes).padStart(10)}  compact JSON of materialized doc`);
  console.log('');
  console.log('Ratio');
  console.log(`  binary / JSON:   ${analysis.binToJsonRatio.toFixed(2)}x  (automerge storage vs reified text)`);
  console.log(
    `  JSON / binary:   ${(analysis.jsonToBinRatio * 100).toFixed(1)}%  (reified is ${analysis.binToJsonRatio >= 1 ? 'smaller' : 'larger'} than storage)`,
  );
  console.log('');
  console.log('Automerge stats');
  console.log(`  changes:         ${analysis.numChanges}`);
  console.log(`  ops:             ${analysis.numOps.toLocaleString()}`);
  console.log(`  actors:          ${analysis.numActors}`);
  console.log(`  ops / MiB bin:   ${Math.round(analysis.opsPerMiB).toLocaleString()}`);
  console.log('');
  console.log('Timing');
  console.log(`  loadIncremental: ${formatMs(analysis.loadMs)}`);
  console.log(`  toJS:            ${formatMs(analysis.toJsMs)}`);
  console.log(`  JSON.stringify:  ${formatMs(analysis.stringifyMs)}`);
};
