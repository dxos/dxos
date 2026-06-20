//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { type Plugin, UrlLoader } from '@dxos/app-framework';

/**
 * Tracks the per-plugin installed version (sourced from `UrlLoader` localStorage)
 * as React state so post-install/update re-renders are deterministic — the value
 * lives in component state rather than being read inline on every render.
 *
 * - Initialised from localStorage at mount.
 * - Auto-resyncs when the plugin manager's plugin list changes (catches external
 *   installs / removes triggered by the list view).
 * - `syncInstalledVersion()` is the explicit handle install/update operations
 *   call inside their `Effect.ensuring` so the post-mutation render sees both
 *   the new version and the cleared `installing`/`updating` flag together.
 */
export const useInstalledVersionTag = (
  pluginId: string,
  plugins: readonly Plugin.Plugin[],
): {
  installedVersionTag: string | undefined;
  syncInstalledVersion: () => void;
} => {
  const [installedVersionTag, setInstalledVersionTag] = useState<string | undefined>(() =>
    UrlLoader.getInstalledVersion(pluginId),
  );

  const syncInstalledVersion = useCallback(() => {
    setInstalledVersionTag(UrlLoader.getInstalledVersion(pluginId));
  }, [pluginId]);

  useEffect(() => {
    syncInstalledVersion();
  }, [plugins, syncInstalledVersion]);

  return { installedVersionTag, syncInstalledVersion };
};
