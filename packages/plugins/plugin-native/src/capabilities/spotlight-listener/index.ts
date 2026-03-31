//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const SpotlightListener = Capability.lazy('SpotlightListener', () => import('./spotlight-listener'));
