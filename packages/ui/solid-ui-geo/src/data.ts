//
// Copyright 2025 DXOS.org
//

import { type Topology } from 'topojson-specification';

export const loadTopology = async (): Promise<Topology> => {
  return (await import('../data/countries-110m')).default;
};
