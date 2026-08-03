//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { Connector, ConnectorCoordinator, ConnectorEvents } from '#types';

export * from './connector-coordinator';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [Connector],
});
export const BuiltinConnectors = Capability.lazyModule(
  'BuiltinConnectors',
  { provides: [Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connectors'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OAuthRedirect = Capability.lazyModule(
  'OAuthRedirect',
  { requires: [ConnectorCoordinator], provides: [], activatesOn: ConnectorEvents.Start },
  () => import('./oauth-redirect'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.dialog', 'org.dxos.role.formInput'],
});
