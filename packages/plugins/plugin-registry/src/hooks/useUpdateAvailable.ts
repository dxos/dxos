//
// Copyright 2026 DXOS.org
//

import { type Plugin, UrlLoader } from '@dxos/app-framework';

/**
 * Returns a set of plugin ids for which the registry has a newer version
 * than what was recorded at install time.
 *
 * Only flags plugins where a version was recorded at install time AND it differs
 * from the catalog's current version. Legacy installs (no version stored) are ignored.
 *
 * NOTE: this is intentionally NOT memoised. The installed-version side of the
 * comparison lives in localStorage and is mutated by `manager.add` /
 * `manager.remove` / `UrlLoader.setInstalledVersion` outside React's view, so a
 * memo keyed on `entries` would happily return stale data for the rest of the
 * session after an update completes (the bug that produced "Update button
 * reappears after Updating…"). The loop is O(catalog size) sync reads — cheap
 * enough to do every render.
 */
export const useUpdateAvailableIds = (entries: readonly Plugin.Meta[]): ReadonlySet<string> => {
  const ids = new Set<string>();
  for (const entry of entries) {
    const installedVersion = UrlLoader.getInstalledVersion(entry.profile.key);
    if (installedVersion !== undefined && installedVersion !== entry.release?.version) {
      ids.add(entry.profile.key);
    }
  }
  return ids;
};
