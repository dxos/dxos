//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';
import { type ThreadCapabilities } from '@dxos/plugin-thread';

export const ChannelBackend = Capability.lazy<ThreadCapabilities.ChannelBackendProvider>(
  'BlueskyChannelBackend',
  () => import('./channel-backend'),
);
export const IntegrationProvider = Capability.lazy('BlueskyIntegrationProvider', () => import('./connector'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
