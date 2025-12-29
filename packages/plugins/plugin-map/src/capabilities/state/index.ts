//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const MapState = Capability.lazy('MapState', () => import('./state'));

