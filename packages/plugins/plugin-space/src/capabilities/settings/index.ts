//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const SpaceSettings = Capability.lazy('SpaceSettings', () => import('./settings'));
