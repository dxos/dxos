//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import { ThreadCapabilities } from '@dxos/plugin-thread';

export const ChannelBackend = Capability.lazyModule(
  'BlueskyChannelBackend',
  { provides: [ThreadCapabilities.ChannelBackend], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./channel-backend'),
);
export const Connector = Capability.lazyModule(
  'BlueskyConnector',
  { provides: [ConnectorCapability], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./connector'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
