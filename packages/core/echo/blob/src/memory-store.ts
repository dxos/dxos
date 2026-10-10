//
// Copyright 2026 DXOS.org
//

import { type LocalBlob, type LocalBlobStore } from './backend.ts';

interface Entry extends LocalBlob {
  uploaded: boolean;
}

/**
 * {@link LocalBlobStore} held in process memory, for tests and for hosts with no durable store.
 * Nothing survives the process, so pending uploads made here are lost on exit.
 */
export const createMemoryBlobStore = (): LocalBlobStore => {
  // Insertion order doubles as the "oldest first" order `listPending` promises.
  const entries = new Map<string, Entry>();

  return {
    put: async (key, data, { contentType, uploaded }) => {
      const existing = entries.get(key);
      if (existing) {
        existing.contentType ??= contentType;
        existing.uploaded ||= uploaded;
        return;
      }
      entries.set(key, { data, contentType, uploaded });
    },

    get: async (key) => {
      const entry = entries.get(key);
      return entry && { data: entry.data, contentType: entry.contentType };
    },

    has: async (key) => entries.has(key),

    listPending: async ({ limit }) =>
      [...entries]
        .filter(([, entry]) => !entry.uploaded)
        .slice(0, limit)
        .map(([key]) => key),

    markUploaded: async (key) => {
      const entry = entries.get(key);
      if (entry) {
        entry.uploaded = true;
      }
    },
  };
};
