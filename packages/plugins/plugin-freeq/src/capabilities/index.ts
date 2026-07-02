//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type ThreadCapabilities } from '@dxos/plugin-thread';

import { type ConnectionManager as ConnectionManagerService } from '../services';

export const ChannelBackend = Capability.lazy<ThreadCapabilities.ChannelBackendProvider>(
  'FreeqChannelBackend',
  () => import('./channel-backend'),
);
export const ConnectionManager = Capability.lazy<ConnectionManagerService>(
  'FreeqConnectionManager',
  () => import('./connection-manager'),
);
