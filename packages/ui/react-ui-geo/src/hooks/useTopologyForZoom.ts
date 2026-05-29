//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';
import { type Topology } from 'topojson-specification';

import { type CountriesResolution, loadTopology } from '../data';

export type LevelTier = {
  /** Lower bound (inclusive) of the zoom range. */
  minZoom: number;
  /** Topology resolution to load when this tier is active. */
  level: CountriesResolution;
};

const DEFAULT_TIERS: LevelTier[] = [
  { minZoom: 0, level: '110m' },
  { minZoom: 3, level: '50m' },
  { minZoom: 6, level: '10m' },
];

const pickTier = (zoom: number, tiers: LevelTier[]): LevelTier => {
  let match = tiers[0];
  for (const tier of tiers) {
    if (zoom >= tier.minZoom) {
      match = tier;
    }
  }
  return match;
};

export type UseTopologyForZoomOptions = {
  /** Zoom buckets that map a zoom value to a resolution. Default: 110m / 50m / 10m at 0 / 3 / 6. */
  tiers?: LevelTier[];
};

/**
 * Loads topology data at a resolution that matches the current zoom. Each
 * resolution is a separate dynamic `import()` so unused detail levels are
 * never fetched. Previously-loaded topologies are kept in a module-level
 * cache so re-crossing a tier boundary doesn't re-parse the file.
 *
 * Returns the *currently displayed* topology — which is the last successfully
 * loaded one. While a heavier tier is loading, the previous (cheaper)
 * topology stays on screen, avoiding a blank canvas during the fetch.
 */
export const useTopologyForZoom = (zoom: number, options: UseTopologyForZoomOptions = {}): Topology | undefined => {
  const { tiers = DEFAULT_TIERS } = options;
  const tier = pickTier(zoom, tiers);

  const [topology, setTopology] = useState<Topology | undefined>(() => topologyCache.get(tier.level));

  useEffect(() => {
    const cached = topologyCache.get(tier.level);
    if (cached) {
      setTopology(cached);
      return;
    }

    let disposed = false;
    void loadTopology(tier.level).then((loaded) => {
      topologyCache.set(tier.level, loaded);
      if (!disposed) {
        setTopology(loaded);
      }
    });

    return () => {
      disposed = true;
    };
  }, [tier.level]);

  return topology;
};

const topologyCache = new Map<CountriesResolution, Topology>();
