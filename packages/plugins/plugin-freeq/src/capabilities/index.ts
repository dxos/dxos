//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

// Contributes both the connection manager and the channel backend (see channel-backend.ts).
export const ChannelBackend = Capability.lazy('FreeqChannelBackend', () => import('./channel-backend'));
