//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Tools = Capability.lazy('Tools', () => import('./tools'));

