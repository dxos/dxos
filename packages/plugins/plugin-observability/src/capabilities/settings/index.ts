//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ObservabilitySettings = Capability.lazy('ObservabilitySettings', () => import('./settings'));
