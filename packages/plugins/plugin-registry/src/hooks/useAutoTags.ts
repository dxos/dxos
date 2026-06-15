//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Registry, UrlLoader } from '@dxos/app-framework';

import { getRemotePluginIds } from '../categories';

/**
 * Auto-tags that are derived at display time rather than persisted to `Plugin.Meta`.
 * - `registry`: plugin id appears in the registry catalog manifest.
 * - `local`: plugin was loaded from a `localhost` / `127.0.0.1` / `::1` URL.
 */
export type AutoTagsMap = Record<string, readonly string[]>;

/**
 * Computes the per-plugin-id extra tags the UI should display.
 *
 * Reads the persisted remote-plugin entries synchronously to derive `local`, and
 * adds `registry` for any plugin id found in the supplied registry manifest entries.
 */
export const useAutoTags = (registryEntries: readonly Registry.Plugin[]): AutoTagsMap =>
  useMemo(() => {
    const byId: Record<string, string[]> = {};
    const addTag = (id: string, tag: string) => {
      const existing = byId[id];
      if (!existing) {
        byId[id] = [tag];
      } else if (!existing.includes(tag)) {
        existing.push(tag);
      }
    };

    for (const entry of UrlLoader.getRemoteEntries()) {
      if (UrlLoader.isLocalUrl(entry.url)) {
        addTag(entry.id, 'local');
      }
    }
    for (const entry of registryEntries) {
      addTag(entry.id, 'registry');
    }

    return byId;
  }, [registryEntries]);

/**
 * Returns the set of plugin ids known to originate from a remote URL (not bundled).
 * Used to filter the Official/Recommended sections so third-party plugins are excluded.
 */
export const useRemotePluginIds = (): ReadonlySet<string> => useMemo(() => getRemotePluginIds(), []);
