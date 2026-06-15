//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Registry } from '@dxos/app-framework';

import { useRegistryPlugins } from './useRegistryPlugins';

/**
 * Resolves the registry catalog entry for a plugin by id, plus the two fields
 * (`moduleUrl`, `repo`) the rest of the article cares about.
 */
export const useCatalogEntry = (
  pluginId: string,
): {
  catalogEntry: Registry.Plugin | undefined;
  moduleUrl: string | undefined;
  repo: string | undefined;
} => {
  const { entries } = useRegistryPlugins();
  const catalogEntry = useMemo(() => entries.find((entry) => entry.id === pluginId), [entries, pluginId]);
  return { catalogEntry, moduleUrl: catalogEntry?.moduleUrl, repo: catalogEntry?.repo };
};
