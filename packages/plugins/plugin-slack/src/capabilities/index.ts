//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';

import { SlackEvents } from '#types';

export const Connector = Capability.lazyModule(
  'SlackConnector',
  { provides: [ConnectorCapability], activatesOn: ConnectorEvents.Start },
  () => import('./connector'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: SlackEvents.Start,
});
