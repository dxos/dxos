//
// Copyright 2026 DXOS.org
//

import { decodeChange, getAllChanges, init, load, loadIncremental, stats, toJS } from '@automerge/automerge';

import { loadDocumentChunks } from './automerge-chunks.js';
import { formatBytes, formatMs } from './format.js';

/**
 * Summarize reified document shape (helps explain why history may diverge from JSON size).
 *
 * @param {unknown} value
 */
export const summarizeReifiedState = (value) => {
  const root = value && typeof value === 'object' ? value : {};
  const objects =
    root && typeof root === 'object' && 'objects' in root && root.objects && typeof root.objects === 'object'
      ? root.objects
      : {};
  const objectIds = Object.keys(objects);
  const objectSummaries = objectIds.slice(0, 5).map((objectId) => {
    const entry = objects[objectId];
    const data = entry?.data ?? {};
    const tags = data.tags && typeof data.tags === 'object' ? data.tags : undefined;
    const tagEntries = tags ? Object.entries(tags) : [];
    const tagIdCount = tagEntries.reduce((total, [, ids]) => total + (Array.isArray(ids) ? ids.length : 0), 0);
    return {
      objectId,
      name: typeof data.name === 'string' ? data.name : undefined,
      dataKeys: Object.keys(data),
      hasTagsIndex: tagEntries.length > 0,
      tagKeyCount: tagEntries.length,
      tagIdCount,
      largestTagArray: tagEntries.reduce((max, [, ids]) => Math.max(max, Array.isArray(ids) ? ids.length : 0), 0),
    };
  });

  return {
    topLevelKeys: Object.keys(root),
    objectCount: objectIds.length,
    objectSummaries,
  };
};

/**
 * Per-chunk ops growth (loads chunks sequentially like StorageSubsystem).
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} documentId
 */
export const analyzeChunkGrowth = (db, documentId) => {
  const chunks = loadDocumentChunks(db, documentId);
  const rows = [];
  let doc = undefined;

  for (const chunk of chunks) {
    const before = doc ? stats(doc) : null;
    const start = performance.now();
    doc = doc === undefined ? load(chunk.data) : loadIncremental(doc, chunk.data);
    const loadMs = performance.now() - start;
    const after = stats(doc);
    rows.push({
      type: chunk.type,
      encodedKey: chunk.encodedKey,
      bytes: chunk.data.length,
      loadMs,
      totalOps: after.numOps ?? 0,
      deltaOps: before ? (after.numOps ?? 0) - (before.numOps ?? 0) : (after.numOps ?? 0),
      totalChanges: after.numChanges ?? 0,
      deltaChanges: before ? (after.numChanges ?? 0) - (before.numChanges ?? 0) : (after.numChanges ?? 0),
    });
  }

  return rows;
};

/**
 * Decode all changes and aggregate op action counts. Slow on large histories (~1 min for 3k changes / 30M ops).
 *
 * @param {import('@automerge/automerge').Doc<unknown>} doc
 */
export const analyzeChangeOps = (doc) => {
  const changes = getAllChanges(doc);
  const actionCounts = {};
  const opsPerChange = [];

  for (const change of changes) {
    const decoded = decodeChange(change);
    const opCount = decoded.ops?.length ?? 0;
    opsPerChange.push(opCount);
    for (const op of decoded.ops ?? []) {
      actionCounts[op.action] = (actionCounts[op.action] || 0) + 1;
    }
  }

  const sorted = [...opsPerChange].sort((left, right) => left - right);
  const percentile = (fraction) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;

  const totalOps = Object.values(actionCounts).reduce((sum, count) => sum + count, 0);
  const actionPercent = Object.fromEntries(
    Object.entries(actionCounts).map(([action, count]) => [action, totalOps > 0 ? (count / totalOps) * 100 : 0]),
  );

  return {
    changeCount: changes.length,
    totalDecodedOps: totalOps,
    actionCounts,
    actionPercent,
    opsPerChange: {
      min: sorted[0] ?? 0,
      p50: percentile(0.5),
      p95: percentile(0.95),
      max: sorted[sorted.length - 1] ?? 0,
      over1k: opsPerChange.filter((count) => count > 1000).length,
      over10k: opsPerChange.filter((count) => count > 10000).length,
    },
  };
};

/**
 * @param {ReturnType<typeof analyzeChangeOps>} changeOps
 * @param {ReturnType<typeof summarizeReifiedState>} reified
 */
export const inferMutationHypothesis = (changeOps, reified) => {
  const notes = [];
  const setPct = changeOps.actionPercent.set ?? 0;
  const makeTextPct = changeOps.actionPercent.makeText ?? 0;
  const medianOps = changeOps.opsPerChange.p50;

  if (setPct > 80) {
    notes.push(
      `Ops are dominated by "set" (${setPct.toFixed(1)}%) — typical of repeated whole-value replacements (e.g. replacing entire arrays/maps) rather than granular list inserts.`,
    );
  }
  if (makeTextPct > 1) {
    notes.push(
      `"makeText" accounts for ${makeTextPct.toFixed(1)}% of ops — many scalar/string fields are being materialized per change.`,
    );
  }
  if (medianOps > 1000) {
    notes.push(
      `Median ${medianOps.toLocaleString()} ops/change (${changeOps.opsPerChange.over10k} changes exceed 10k ops) — each edit carries heavy history.`,
    );
  }

  const tagHost = reified.objectSummaries.find((summary) => summary.hasTagsIndex);
  if (tagHost) {
    notes.push(
      `Reified state includes a TagIndex-style "tags" map (${tagHost.tagKeyCount} tag keys, ${tagHost.tagIdCount} object ids). DXOS TagIndex.setTag replaces whole arrays via spread (\`[...arr, id]\`), which is a known Automerge bloat pattern.`,
    );
  }

  if (reified.objectCount <= 3 && changeOps.changeCount > 100) {
    notes.push(
      `Only ${reified.objectCount} reified object(s) but ${changeOps.changeCount.toLocaleString()} changes — bloat is almost entirely historical mutations, not current payload size.`,
    );
  }

  return notes;
};

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} documentId
 * @param {Uint8Array} merged
 * @param {{ includeChangeOps?: boolean }} [options]
 */
export const analyzeMutations = (db, documentId, merged, options = {}) => {
  const loadStart = performance.now();
  const doc = loadIncremental(init(), merged);
  const loadMs = performance.now() - loadStart;
  const docStats = stats(doc);
  const value = toJS(doc);
  const reified = summarizeReifiedState(value);

  const chunkGrowth = analyzeChunkGrowth(db, documentId);
  const changeOps = options.includeChangeOps === false ? undefined : analyzeChangeOps(doc);
  const hypotheses = changeOps ? inferMutationHypothesis(changeOps, reified) : [];

  return {
    loadMs,
    docStats,
    reified,
    chunkGrowth,
    changeOps,
    hypotheses,
  };
};

/**
 * @param {ReturnType<typeof analyzeMutations>} analysis
 */
export const printMutationAnalysis = (analysis) => {
  console.log('Mutation analysis');
  console.log('=================');
  console.log(`loadIncremental: ${formatMs(analysis.loadMs)}`);
  console.log('');
  console.log('Reified state');
  console.log(`  top-level keys:  ${analysis.reified.topLevelKeys.join(', ') || '(none)'}`);
  console.log(`  objects:         ${analysis.reified.objectCount}`);
  for (const summary of analysis.reified.objectSummaries) {
    const label = summary.name ? `${summary.objectId} (${summary.name})` : summary.objectId;
    if (summary.hasTagsIndex) {
      console.log(
        `  - ${label}: tags index ${summary.tagKeyCount} keys, ${summary.tagIdCount} ids (largest array ${summary.largestTagArray})`,
      );
    } else {
      console.log(`  - ${label}: keys [${summary.dataKeys.join(', ')}]`);
    }
  }
  console.log('');
  console.log('Chunk growth');
  for (const row of analysis.chunkGrowth) {
    const opsPerChange =
      row.deltaChanges > 0 ? `, ${Math.round(row.deltaOps / row.deltaChanges).toLocaleString()} ops/change` : '';
    console.log(
      `  ${row.type.padEnd(12)} ${formatBytes(row.bytes).padStart(10)}  +${row.deltaOps.toLocaleString()} ops, +${row.deltaChanges} changes${opsPerChange}  (${formatMs(row.loadMs)})`,
    );
  }

  if (!analysis.changeOps) {
    return;
  }

  console.log('');
  console.log('Change op breakdown (all changes decoded)');
  console.log(`  changes:         ${analysis.changeOps.changeCount.toLocaleString()}`);
  console.log(`  decoded ops:     ${analysis.changeOps.totalDecodedOps.toLocaleString()}`);
  console.log(
    `  ops/change:      min ${analysis.changeOps.opsPerChange.min}  p50 ${analysis.changeOps.opsPerChange.p50.toLocaleString()}  p95 ${analysis.changeOps.opsPerChange.p95.toLocaleString()}  max ${analysis.changeOps.opsPerChange.max.toLocaleString()}`,
  );
  console.log(
    `  >1k ops/change:  ${analysis.changeOps.opsPerChange.over1k}   >10k: ${analysis.changeOps.opsPerChange.over10k}`,
  );
  console.log('  actions:');
  for (const [action, count] of Object.entries(analysis.changeOps.actionCounts).sort((a, b) => b[1] - a[1])) {
    const pct = analysis.changeOps.actionPercent[action] ?? 0;
    console.log(`    ${action.padEnd(10)} ${count.toLocaleString().padStart(12)}  (${pct.toFixed(1)}%)`);
  }

  if (analysis.hypotheses.length > 0) {
    console.log('');
    console.log('Likely cause');
    for (const note of analysis.hypotheses) {
      console.log(`  - ${note}`);
    }
  }
};
