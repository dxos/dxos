//
// Copyright 2026 DXOS.org
//

import { type BranchStore } from '@dxos/echo-client';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

const KEY_PREFIX = 'dxos.org/echo/branches';

/**
 * Device-local {@link BranchStore} backed by `localStorage`, keyed per space. The current-branch
 * selection is per-device and must survive a client reload but never replicate, so it lives in
 * origin-scoped storage rather than in the synced documents. No-ops where `localStorage` is
 * unavailable (web workers, node) — the selection then lives only in memory for that session.
 */
export const createLocalStorageBranchStore = (spaceId: SpaceId): BranchStore => {
  const key = `${KEY_PREFIX}/${spaceId}`;
  return {
    load: async () => {
      if (typeof localStorage === 'undefined') {
        return {};
      }
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
      } catch (err) {
        log.warn('failed to read branch selection', { err });
        return {};
      }
    },
    save: async (entries) => {
      if (typeof localStorage === 'undefined') {
        return;
      }
      try {
        if (Object.keys(entries).length === 0) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(entries));
        }
      } catch (err) {
        // Quota exceeded or storage disabled — the selection stays in memory for this session.
        log.warn('failed to persist branch selection', { err });
      }
    },
  };
};
