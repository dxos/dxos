//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Window = Capability.lazy('Window', () => import('./window'));
