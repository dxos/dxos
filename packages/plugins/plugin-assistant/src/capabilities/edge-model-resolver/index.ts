//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const EdgeModelResolver = Capability.lazy('EdgeModelResolver', () => import('./edge-model-resolver'));

