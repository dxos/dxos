//
// Copyright 2026 DXOS.org
//

/**
 * Encodes a StorageKey array to SQLite TEXT (mirrors SqliteStorageAdapter.encodeKey).
 *
 * @param {string[]} key
 * @returns {string}
 */
export const encodeKey = (key) => key.map((part) => part.replaceAll('%', '%25').replaceAll('-', '%2D')).join('-');

/**
 * Decodes SQLite TEXT key back to StorageKey array (mirrors SqliteStorageAdapter.decodeKey).
 *
 * @param {string} encoded
 * @returns {string[]}
 */
export const decodeKey = (encoded) =>
  encoded.split('-').map((part) => part.replaceAll('%2D', '-').replaceAll('%25', '%'));

/**
 * Parses an automerge_chunks row key into document id and chunk kind.
 *
 * @param {string} encodedKey
 * @returns {{ documentId: string | null, kind: 'document' | 'snapshot' | 'incremental' | 'meta' | 'unknown' }}
 */
export const parseChunkKey = (encodedKey) => {
  if (encodedKey === encodeKey(['storage-adapter-id'])) {
    return { documentId: null, kind: 'meta' };
  }

  if (encodedKey.startsWith('subduction-')) {
    return { documentId: null, kind: 'subduction' };
  }

  const parts = decodeKey(encodedKey);
  if (parts.length === 1) {
    return { documentId: parts[0], kind: 'document' };
  }

  const [documentId, kind] = parts;
  if (kind === 'snapshot' || kind === 'incremental') {
    return { documentId, kind };
  }

  return { documentId: documentId ?? null, kind: 'unknown' };
};
