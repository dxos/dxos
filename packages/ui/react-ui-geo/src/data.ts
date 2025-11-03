//
// Copyright 2024 DXOS.org
//

import { type Topology } from 'topojson-specification';

export const loadTopology = async (): Promise<Topology> => (await import('../data/countries-110m.ts')).default;
