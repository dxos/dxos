//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const SpaceState = Capability.lazy('SpaceState', () => import('./state'));
