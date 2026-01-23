//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ComputeRuntime = Capability.lazy('ComputeRuntime', () => import('./compute-runtime'));
