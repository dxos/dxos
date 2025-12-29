//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ThreadState = Capability.lazy('ThreadState', () => import('./state'));

