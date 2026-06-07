//
// Copyright 2026 DXOS.org
//

import { parseChunkKey } from './automerge-keys.js';
import { all, get, openDatabase, tableExists } from './db.js';

/**
 * @typedef {Object} AutomergeDocumentStats
 * @property {number} documentsWithHeads
 * @property {number} documentsWithChunks
 * @property {number} totalChunks
 * @property {number} totalBytes
 */

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @returns {AutomergeDocumentStats}
 */
export const collectAutomergeDocumentStats = (db) => {
  const documentsWithHeads = tableExists(db, 'automerge_heads')
    ? Number(get(db, 'SELECT COUNT(*) AS n FROM automerge_heads')?.n ?? 0)
    : 0;

  if (!tableExists(db, 'automerge_chunks')) {
    return { documentsWithHeads, documentsWithChunks: 0, totalChunks: 0, totalBytes: 0 };
  }

  const rows = all(db, 'SELECT key, LENGTH(data) AS bytes FROM automerge_chunks');
  const byDocument = new Map();
  let totalBytes = 0;

  for (const row of rows) {
    totalBytes += Number(row.bytes ?? 0);
    const parsed = parseChunkKey(String(row.key));
    if (!parsed.documentId) {
      continue;
    }
    const current = byDocument.get(parsed.documentId) ?? { chunks: 0, bytes: 0 };
    current.chunks += 1;
    current.bytes += Number(row.bytes ?? 0);
    byDocument.set(parsed.documentId, current);
  }

  return {
    documentsWithHeads,
    documentsWithChunks: byDocument.size,
    totalChunks: rows.length,
    totalBytes,
  };
};

/**
 * @typedef {Object} AutomergeDocumentRow
 * @property {string} documentId
 * @property {number} chunks
 * @property {number} bytes
 * @property {number} snapshots
 * @property {number} incrementals
 * @property {boolean} hasHeads
 * @property {number | null} headsBytes
 */

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @returns {AutomergeDocumentRow[]}
 */
export const listAutomergeDocuments = (db) => {
  /** @type {Map<string, AutomergeDocumentRow>} */
  const documents = new Map();

  if (tableExists(db, 'automerge_heads')) {
    const headRows = all(db, 'SELECT document_id, LENGTH(heads) AS heads_bytes FROM automerge_heads');
    for (const row of headRows) {
      documents.set(String(row.document_id), {
        documentId: String(row.document_id),
        chunks: 0,
        bytes: 0,
        snapshots: 0,
        incrementals: 0,
        hasHeads: true,
        headsBytes: Number(row.heads_bytes ?? 0),
      });
    }
  }

  if (tableExists(db, 'automerge_chunks')) {
    const chunkRows = all(db, 'SELECT key, LENGTH(data) AS bytes FROM automerge_chunks');
    for (const row of chunkRows) {
      const parsed = parseChunkKey(String(row.key));
      if (!parsed.documentId) {
        continue;
      }

      const existing = documents.get(parsed.documentId) ?? {
        documentId: parsed.documentId,
        chunks: 0,
        bytes: 0,
        snapshots: 0,
        incrementals: 0,
        hasHeads: false,
        headsBytes: null,
      };

      existing.chunks += 1;
      existing.bytes += Number(row.bytes ?? 0);
      if (parsed.kind === 'snapshot') {
        existing.snapshots += 1;
      }
      if (parsed.kind === 'incremental') {
        existing.incrementals += 1;
      }
      documents.set(parsed.documentId, existing);
    }
  }

  return [...documents.values()].sort((left, right) => right.bytes - left.bytes || left.documentId.localeCompare(right.documentId));
};

/**
 * @param {string} dbPath
 * @param {{ json?: boolean }} [options]
 */
export const printAutomergeDocumentIds = (dbPath, options = {}) => {
  const db = openDatabase(dbPath);
  const documents = listAutomergeDocuments(db);

  if (options.json) {
    console.log(JSON.stringify(documents, null, 2));
    return;
  }

  console.log(`automerge documents: ${documents.length}`);
  console.log('document_id                      heads  chunks  snapshots  incrementals  bytes');
  for (const doc of documents) {
    console.log(
      `${doc.documentId.padEnd(32)} ${String(doc.hasHeads).padEnd(5)} ${String(doc.chunks).padEnd(6)} ${String(doc.snapshots).padEnd(9)} ${String(doc.incrementals).padEnd(13)} ${doc.bytes}`,
    );
  }
};
