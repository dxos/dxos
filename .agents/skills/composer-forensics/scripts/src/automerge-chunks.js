//
// Copyright 2026 DXOS.org
//

import { decodeKey, encodeKey } from './automerge-keys.js';
import { all } from './db.js';

/**
 * @param {unknown} value
 * @returns {Uint8Array}
 */
export const toUint8Array = (value) => {
  if (value instanceof Uint8Array && value.constructor === Uint8Array) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array(value);
};

/**
 * Loads snapshot or incremental chunks for a document (mirrors SqliteStorageAdapter.loadRange).
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} documentId
 * @param {'snapshot' | 'incremental'} type
 * @returns {Array<{ key: string[], data: Uint8Array, encodedKey: string }>}
 */
export const loadChunkRange = (db, documentId, type) => {
  const prefix = encodeKey([documentId, type]);
  const glob = `${prefix}-*`;
  const rows = all(
    db,
    `SELECT key, data FROM automerge_chunks
     WHERE key = ? OR key GLOB ?
     ORDER BY key ASC`,
    [prefix, glob],
  );

  return rows.map((row) => ({
    encodedKey: String(row.key),
    key: decodeKey(String(row.key)),
    data: toUint8Array(row.data),
  }));
};

/**
 * Loads all document chunks in StorageSubsystem order: snapshots, then incrementals.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} documentId
 */
export const loadDocumentChunks = (db, documentId) => {
  const snapshots = loadChunkRange(db, documentId, 'snapshot').map((chunk) => ({
    ...chunk,
    type: 'snapshot',
  }));
  const incrementals = loadChunkRange(db, documentId, 'incremental').map((chunk) => ({
    ...chunk,
    type: 'incremental',
  }));
  return [...snapshots, ...incrementals];
};

/**
 * @param {Uint8Array[]} arrays
 * @returns {Uint8Array}
 */
export const mergeArrays = (arrays) => {
  const length = arrays.reduce((total, item) => total + item.length, 0);
  const merged = new Uint8Array(length);
  let offset = 0;
  for (const item of arrays) {
    merged.set(item, offset);
    offset += item.length;
  }
  return merged;
};
