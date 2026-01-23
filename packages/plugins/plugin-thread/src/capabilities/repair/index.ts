//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Repair = Capability.lazy('Repair', () => import('./repair'));
