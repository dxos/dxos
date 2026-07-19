//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { SpaceCapability } from '@dxos/plugin-space';

import { Connector, ConnectorCoordinator } from '#types';

export * from './connector-coordinator';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [Connector],
});
export const BuiltinConnectors = Capability.lazyModule(
  'BuiltinConnectors',
  { provides: [Connector] },
  () => import('./connectors'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OAuthRedirect = Capability.lazyModule(
  'OAuthRedirect',
  { requires: [ConnectorCoordinator], provides: [] },
  () => import('./oauth-redirect'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
