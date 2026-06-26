//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Plugin } from '@dxos/app-framework';

import { useRegistryPlugins } from './useRegistryPlugins';

/**
 * Resolves the registry catalog entry for a plugin by id, plus the `moduleUrl`
 * the install/update actions need.
 */
export const useCatalogEntry = (
  pluginId: string,
): {
  catalogEntry: Plugin.Meta | undefined;
  moduleUrl: string | undefined;
} => {
  const { entries } = useRegistryPlugins();
  const catalogEntry = useMemo(() => entries.find((entry) => entry.profile.key === pluginId), [entries, pluginId]);
  return { catalogEntry, moduleUrl: catalogEntry?.release?.moduleUrl };
};
