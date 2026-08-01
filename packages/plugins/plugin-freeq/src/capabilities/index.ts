//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import { ThreadCapabilities } from '@dxos/plugin-thread';

import { FreeqEvents } from '../events';
import * as FreeqCapabilities from '../FreeqCapabilities';

// Contributes both the connection manager and the channel backend (see channel-backend.ts).
export const ChannelBackend = Capability.lazyModule(
  'FreeqChannelBackend',
  {
    provides: [FreeqCapabilities.ConnectionManager, ThreadCapabilities.ChannelBackend],
    activatesOn: FreeqEvents.Start,
  },
  () => import('./channel-backend'),
);
