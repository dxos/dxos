//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ComputeGraphRegistry = Capability.lazy('ComputeGraphRegistry', () => import('./compute-graph-registry'));

