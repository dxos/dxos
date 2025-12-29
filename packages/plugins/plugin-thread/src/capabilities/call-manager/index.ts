//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const CallManager = Capability.lazy('CallManager', () => import('./call-manager'));

