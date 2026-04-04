//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const SpacetimeSettings = Capability.lazy('SpacetimeSettings', () => import('./settings'));
