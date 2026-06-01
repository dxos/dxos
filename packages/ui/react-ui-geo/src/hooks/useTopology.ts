//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';
import { type Topology } from 'topojson-specification';

import { type CountriesResolution, loadTopology } from '../data';

export type Level = CountriesResolution;

export type LevelTier = {
  /** Lower bound (inclusive) of the zoom range. */
  minZoom: number;
  /** Topology resolution to load when this tier is active. */
  level: CountriesResolution;
};

/** Default zoom buckets: 110m below zoom 3, 50m at/above it. */
const DEFAULT_TIERS: LevelTier[] = [
  { minZoom: 0, level: '110m' },
  { minZoom: 3, level: '50m' },
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

export type UseTopologyOptions = {
  /** Zoom buckets that map a zoom value to a resolution. Default: 110m / 50m at 0 / 3. */
  tiers?: LevelTier[];
};

// Previously-loaded topologies are kept in a module-level cache so re-crossing a tier boundary
// doesn't re-fetch/re-parse the file.
const topologyCache = new Map<CountriesResolution, Topology>();

/**
 * Loads TopoJSON country data.
 *
 * - With no arguments, loads the default `110m` resolution.
 * - With a `zoom`, loads the resolution matching the current zoom tier (progressive level-of-detail).
 *   Each resolution is a separate dynamic `import()`, so unused detail levels are never fetched, and
 *   while a heavier tier loads the previously-displayed topology stays on screen (no blank canvas).
 */
export const useTopology: {
  (): Topology | undefined;
  (zoom: number, options?: UseTopologyOptions): Topology | undefined;
} = (zoom?: number, options: UseTopologyOptions = {}): Topology | undefined => {
  const { tiers = DEFAULT_TIERS } = options;
  const level: CountriesResolution = zoom === undefined ? '110m' : pickTier(zoom, tiers).level;

  const [topology, setTopology] = useState<Topology | undefined>(() => topologyCache.get(level));

  useEffect(() => {
    const cached = topologyCache.get(level);
    if (cached) {
      setTopology(cached);
      return;
    }

    let disposed = false;
    void loadTopology(level).then((loaded) => {
      topologyCache.set(level, loaded);
      if (!disposed) {
        setTopology(loaded);
      }
    });

    return () => {
      disposed = true;
    };
  }, [level]);

  return topology;
};
