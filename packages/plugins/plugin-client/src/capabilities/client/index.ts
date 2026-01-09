//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Client = Capability.lazy('Client', () => import('./client'));
