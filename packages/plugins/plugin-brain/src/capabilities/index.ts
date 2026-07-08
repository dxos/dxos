//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const FactStore = Capability.lazy('FactStore', () => import('./fact-store'));
