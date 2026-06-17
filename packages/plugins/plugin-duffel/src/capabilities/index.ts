//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Duffel = Capability.lazy('Duffel', () => import('./duffel'));
