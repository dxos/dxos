//
// Copyright 2024 DXOS.org
//

import { useAsyncState } from '@dxos/react-ui';

import { type CountriesResolution, loadTopology } from '../data';

export type Level = CountriesResolution;

/**
 * Loads TopoJSON country data at the requested resolution. The level argument
 * is forwarded to `loadTopology`, whose literal-branch dispatch lets the
 * bundler code-split each resolution into its own chunk.
 */
export const useTopology = (level: Level = '110m') => {
  return useAsyncState(() => loadTopology(level), [level]);
};
