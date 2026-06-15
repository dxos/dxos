//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Surface = Capability.lazy('Surface', () => import('./surface'));
