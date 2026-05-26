//
// Copyright 2024 DXOS.org
//

import { type Topology } from 'topojson-specification';

/**
 * World-atlas Natural Earth resolutions. Higher numbers = lower detail.
 * - `110m` (~110 KB): default; suitable for low-zoom globes.
 * - `50m`  (~750 KB): mid-zoom.
 * - `10m`  (~3.6 MB): high zoom; pair with `useSimplifiedTopology` to keep
 *   per-frame render cost bounded.
 */
export type CountriesResolution = '110m' | '50m' | '10m';

export const loadTopology = async (resolution: CountriesResolution = '110m'): Promise<Topology> => {
  switch (resolution) {
    case '10m':
      return (await import('../data/countries-10m.ts')).default;
    case '50m':
      return (await import('../data/countries-50m.ts')).default;
    case '110m':
    default:
      return (await import('../data/countries-110m.ts')).default;
  }
};
