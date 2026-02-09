//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ObservabilityState = Capability.lazy('ObservabilityState', () => import('./state'));
