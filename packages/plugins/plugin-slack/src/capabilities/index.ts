//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';

export const Connector = Capability.lazyModule(
  'SlackConnector',
  { provides: [ConnectorCapability], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./connector'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
