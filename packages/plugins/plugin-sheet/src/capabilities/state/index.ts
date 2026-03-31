//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const SheetState = Capability.lazy('SheetState', () => import('./state'));
