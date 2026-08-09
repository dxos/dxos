//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import * as ConnectorCoordination from '../types/ConnectorCoordination';
import * as ConnectorEvents from '../types/ConnectorEvents';
import * as ConnectorSpec from '../types/ConnectorSpec';

export * from './connector-coordinator';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [ConnectorSpec.Connector],
});
export const BuiltinConnectors = Capability.lazyModule(
  'BuiltinConnectors',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connectors'),
);
// Empty in the browser: `connector oauth` needs a Bun callback server, so only the
// node barrel loads the command graph. The export still has to exist here — `#capabilities`
// resolves its types through this file for both variants.
export const Commands = AppCapability.commands([]);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OAuthRedirect = Capability.lazyModule(
  'OAuthRedirect',
  { requires: [ConnectorCoordination.ConnectorCoordinator], provides: [], activatesOn: ConnectorEvents.Start },
  () => import('./oauth-redirect'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.dialog', 'org.dxos.role.formInput'],
});
