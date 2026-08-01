//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Connector as ConnectorCapability, ConnectorEvents } from '@dxos/plugin-connector';
import { ThreadCapabilities } from '@dxos/plugin-thread';

import { BlueskyEvents } from '../events';

export const ChannelBackend = Capability.lazyModule(
  'BlueskyChannelBackend',
  { provides: [ThreadCapabilities.ChannelBackend], activatesOn: BlueskyEvents.Start },
  () => import('./channel-backend'),
);
export const Connector = Capability.lazyModule(
  'BlueskyConnector',
  { provides: [ConnectorCapability], activatesOn: ConnectorEvents.Start },
  () => import('./connector'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: BlueskyEvents.Start,
});
