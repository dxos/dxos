//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import * as ThreadEvents from '@dxos/plugin-thread/ThreadEvents';

export const ChannelBackend = Capability.lazyModule(
  'BlueskyChannelBackend',
  { provides: [ThreadCapabilities.ChannelBackend], activatesOn: ThreadEvents.Start },
  () => import('./channel-backend'),
);
export const Connector = Capability.lazyModule(
  'BlueskyConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const Schema = AppCapability.schema(() => import('./schema'));
