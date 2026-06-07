//
// Copyright 2026 DXOS.org
//

import { listAutomergeDocuments } from './automerge.js';
import { all, openDatabase, tableExists } from './db.js';
import { formatBytes } from './format.js';

/**
 * @param {string} dbPath
 * @param {{ json?: boolean }} [options]
 */
export const printAutomergeDocumentList = (dbPath, options = {}) => {
  const db = openDatabase(dbPath);
  if (!tableExists(db, 'automerge_chunks')) {
    throw new Error('automerge_chunks table not found');
  }

  const documents = listAutomergeDocuments(db);
  const objectCounts = new Map(
    all(db, "SELECT documentId, COUNT(*) AS n FROM objectMeta WHERE documentId != '' GROUP BY documentId").map(
      (row) => [String(row.documentId), Number(row.n)],
    ),
  );

  const rows = documents.map((doc, index) => ({
    rank: index + 1,
    documentId: doc.documentId,
    bytes: doc.bytes,
    bytesHuman: formatBytes(doc.bytes),
    chunks: doc.chunks,
    snapshots: doc.snapshots,
    incrementals: doc.incrementals,
    hasHeads: doc.hasHeads,
    objectMetaRows: objectCounts.get(doc.documentId) ?? 0,
  }));

  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  console.log(`automerge documents: ${rows.length} (sorted by combined chunk bytes)`);
  console.log('rank  document_id                      binary       chunks  objects  heads');
  console.log('      (binary = merged snapshot+incremental size; use automerge-inspect for JSON comparison)');
  for (const row of rows) {
    console.log(
      `${String(row.rank).padStart(4)}  ${row.documentId.padEnd(32)} ${row.bytesHuman.padStart(10)}  ${String(row.chunks).padEnd(6)} ${String(row.objectMetaRows).padEnd(7)}  ${row.hasHeads}`,
    );
  }

  if (rows.length > 0) {
    console.log('');
    console.log(`Largest binary: ${rows[0].documentId} (${rows[0].bytesHuman}, ${rows[0].chunks} chunks)`);
    console.log(`  inspect: node automerge-inspect.js <db> ${rows[0].documentId}`);
  }
};
