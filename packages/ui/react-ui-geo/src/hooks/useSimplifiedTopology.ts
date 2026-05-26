//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';
import { presimplify, quantile, simplify } from 'topojson-simplify';
import { type Topology } from 'topojson-specification';

/**
 * Zoom → minWeight policy. The default thresholds were chosen empirically
 * against the 10m world-atlas dataset: each tier targets a percentile of
 * removable points so that the per-frame d3-geo path cost stays roughly
 * constant as the user zooms in.
 */
export type SimplifyTier = {
  /** Lower bound (inclusive) of the zoom range this tier applies to. */
  minZoom: number;
  /** Percentile in [0, 1] passed to `topojson.quantile`. 1 = keep no points; 0 = keep all. */
  percentile: number;
};

const DEFAULT_TIERS: SimplifyTier[] = [
  { minZoom: 0, percentile: 0.95 },
  { minZoom: 2, percentile: 0.85 },
  { minZoom: 4, percentile: 0.6 },
  { minZoom: 7, percentile: 0.3 },
  { minZoom: 12, percentile: 0 },
];

const pickTier = (zoom: number, tiers: SimplifyTier[]): SimplifyTier => {
  let match = tiers[0];
  for (const tier of tiers) {
    if (zoom >= tier.minZoom) {
      match = tier;
    }
  }
  return match;
};

export type UseSimplifiedTopologyOptions = {
  /**
   * Zoom buckets that map a zoom value to a simplification percentile. The
   * hook picks the highest-`minZoom` tier whose bound is ≤ the current zoom,
   * so tiers may be listed in any order but ascending is conventional.
   */
  tiers?: SimplifyTier[];
};

/**
 * Returns a simplified copy of `topology` whose detail tracks the current
 * `zoom`. The source topology is annotated with point weights once via
 * `presimplify`; subsequent zoom changes reuse that work and only re-run
 * the cheap `simplify` pass against a tier-bucketed `minWeight`.
 *
 * Pass the highest-resolution source you have (typically `10m`) and let the
 * hook decimate at low zoom — that's the cheap end of the curve.
 */
export const useSimplifiedTopology = (
  topology: Topology | undefined,
  zoom: number,
  options: UseSimplifiedTopologyOptions = {},
): Topology | undefined => {
  const { tiers = DEFAULT_TIERS } = options;

  // One-shot weight annotation per source topology.
  const presimplified = useMemo(() => (topology ? presimplify(topology) : undefined), [topology]);

  // Stable per-tier quantile lookup so identical zoom buckets do not retrigger.
  const tier = pickTier(zoom, tiers);

  return useMemo(() => {
    if (!presimplified) {
      return undefined;
    }
    if (tier.percentile <= 0) {
      return presimplified;
    }
    const minWeight = quantile(presimplified, tier.percentile);
    return simplify(presimplified, minWeight);
  }, [presimplified, tier]);
};
