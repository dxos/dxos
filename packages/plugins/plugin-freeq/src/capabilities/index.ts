//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import * as ThreadEvents from '@dxos/plugin-thread/ThreadEvents';

import * as FreeqCapabilities from '../FreeqCapabilities';

// Contributes both the connection manager and the channel backend (see channel-backend.ts).
export const ChannelBackend = Capability.lazyModule(
  'FreeqChannelBackend',
  {
    provides: [FreeqCapabilities.ConnectionManager, ThreadCapabilities.ChannelBackend],
    activatesOn: ThreadEvents.Start,
  },
  () => import('./channel-backend'),
);
