//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const SpotlightDismiss = Capability.lazy('SpotlightDismiss', () => import('./spotlight-dismiss'));
