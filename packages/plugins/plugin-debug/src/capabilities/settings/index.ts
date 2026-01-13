//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const DebugSettings = Capability.lazy('DebugSettings', () => import('./settings'));
