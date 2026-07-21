//
// Copyright 2026 DXOS.org
//

import { type BranchStore } from '@dxos/echo-client';
import { log } from '@dxos/log';

const branchSelectionKey = (spaceId: string) => `dxos.org/state/branch-selection/${spaceId}`;

/**
 * Device-local persistence for the current-branch selection of a space. Selections must survive a
 * client reload but never replicate to peers, so they live outside the synced documents: backed by
 * `localStorage` in the browser main thread, and in-memory (per process) elsewhere (node CLI,
 * workers) until a platform metadata store is wired.
 */
export const createDeviceLocalBranchStore = (spaceId: string): BranchStore => {
  if (typeof localStorage === 'undefined') {
    let entries: Record<string, string> = {};
    return {
      load: async () => entries,
      save: async (next) => {
        entries = next;
      },
    };
  }

  const key = branchSelectionKey(spaceId);
  return {
    load: async () => {
      try {
        return JSON.parse(localStorage.getItem(key) ?? '{}');
      } catch (err) {
        log.warn('failed to load branch selections', { key, err });
        return {};
      }
    },
    save: async (entries) => {
      try {
        localStorage.setItem(key, JSON.stringify(entries));
      } catch (err) {
        log.warn('failed to persist branch selections', { key, err });
      }
    },
  };
};
