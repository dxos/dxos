//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const State = Capability.lazy('State', () => import('./state'));
