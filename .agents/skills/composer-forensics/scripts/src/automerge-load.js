//
// Copyright 2026 DXOS.org
//

import { init, load, loadIncremental, stats, toJS } from '@automerge/automerge';

import { loadDocumentChunks, mergeArrays } from './automerge-chunks.js';
import { printSizeComparison } from './automerge-size.js';
import { openDatabase, tableExists } from './db.js';
import { formatBytes, formatMs } from './format.js';
import { listAutomergeDocuments } from './automerge.js';

/**
 * Loads a document the same way automerge-repo StorageSubsystem.loadDoc does.
 *
 * @param {Array<{ type: string, data: Uint8Array, encodedKey: string }>} chunks
 * @returns {{ doc: import('@automerge/automerge/slim').Doc<unknown>, mergedMs: number, perChunkMs: number, chunkTimings: Array<{ encodedKey: string, type: string, bytes: number, ms: number }> }}
 */
export const loadDocumentTimed = (chunks) => {
  const binaries = chunks.map((chunk) => chunk.data).filter((data) => data.length > 0);
  if (binaries.length === 0) {
    throw new Error('No chunk data found for document');
  }

  const merged = mergeArrays(binaries);
  const mergedStart = performance.now();
  const docFromMerged = loadIncremental(init(), merged);
  const mergedMs = performance.now() - mergedStart;

  const chunkTimings = [];
  const perChunkStart = performance.now();
  let doc = undefined;
  for (const chunk of chunks) {
    if (!chunk.data.length) {
      continue;
    }
    const start = performance.now();
    doc = doc === undefined ? load(chunk.data) : loadIncremental(doc, chunk.data);
    chunkTimings.push({
      encodedKey: chunk.encodedKey,
      type: chunk.type,
      bytes: chunk.data.length,
      ms: performance.now() - start,
    });
  }
  const perChunkMs = performance.now() - perChunkStart;
  const docStats = stats(docFromMerged);

  const toJsStart = performance.now();
  const value = toJS(docFromMerged);
  const toJsMs = performance.now() - toJsStart;
  const stringifyStart = performance.now();
  const jsonBytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
  const stringifyMs = performance.now() - stringifyStart;

  return {
    doc: docFromMerged,
    mergedMs,
    perChunkMs,
    chunkTimings,
    stats: docStats,
    combinedBytes: binaries.reduce((total, data) => total + data.length, 0),
    jsonBytes,
    toJsMs,
    stringifyMs,
  };
};

/**
 * @param {string} dbPath
 * @param {string} documentId
 */
export const benchLoadDocument = (dbPath, documentId) => {
  if (!tableExists(openDatabase(dbPath), 'automerge_chunks')) {
    throw new Error('automerge_chunks table not found');
  }

  const db = openDatabase(dbPath);
  const chunks = loadDocumentChunks(db, documentId);
  if (chunks.length === 0) {
    throw new Error(`No chunks found for document ${documentId}`);
  }

  const result = loadDocumentTimed(chunks);
  const objectCount = db
    .prepare("SELECT COUNT(*) AS n FROM objectMeta WHERE documentId = ?")
    .get(documentId)?.n;

  const sizeAnalysis = {
    documentId,
    objectMetaRows: Number(objectCount ?? 0),
    chunkCount: chunks.length,
    snapshotCount: chunks.filter((c) => c.type === 'snapshot').length,
    incrementalCount: chunks.filter((c) => c.type === 'incremental').length,
    combinedBytes: result.combinedBytes,
    jsonBytes: result.jsonBytes,
    binToJsonRatio: result.jsonBytes > 0 ? result.combinedBytes / result.jsonBytes : Infinity,
    jsonToBinRatio: result.combinedBytes > 0 ? result.jsonBytes / result.combinedBytes : Infinity,
    numChanges: result.stats.numChanges ?? 0,
    numOps: result.stats.numOps ?? 0,
    numActors: result.stats.numActors ?? 0,
    opsPerMiB:
      result.combinedBytes > 0 ? (result.stats.numOps ?? 0) / (result.combinedBytes / (1024 * 1024)) : 0,
    loadMs: result.mergedMs,
    toJsMs: result.toJsMs,
    stringifyMs: result.stringifyMs,
  };

  printSizeComparison(sizeAnalysis);
  console.log('');
  console.log('Load benchmark');
  console.log('==============');
  console.log(`database:    ${dbPath}`);
  console.log('');
  console.log('StorageSubsystem-style (merge chunks → single loadIncremental):');
  console.log(`  ${formatMs(result.mergedMs)}`);
  console.log('');
  console.log('Per-chunk (first load, then loadIncremental):');
  console.log(`  total: ${formatMs(result.perChunkMs)}`);
  for (const timing of result.chunkTimings) {
    console.log(`  - ${timing.encodedKey}  ${formatBytes(timing.bytes).padStart(10)}  ${formatMs(timing.ms)}`);
  }
};

/**
 * @param {string} dbPath
 * @returns {string | undefined}
 */
export const findLargestDocumentId = (dbPath) => {
  const documents = listAutomergeDocuments(openDatabase(dbPath));
  return documents.find((doc) => doc.snapshots + doc.incrementals > 0)?.documentId ?? documents[0]?.documentId;
};
