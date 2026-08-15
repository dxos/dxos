//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { ConnectorCoordination, ConnectorEvents, ConnectorSpec } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export * from './connector-coordinator';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [ConnectorSpec.Connector],
  environments: ['node'],
});
export const BuiltinConnectors = Capability.lazyModule(
  'BuiltinConnectors',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connectors'),
);
// Empty in the browser: `connector oauth` needs a Bun callback server, so only the node barrel
// loads the real command graph, via overrides.node.ts. Also included in browser: `AppCapability
// .commands`'s own doc comment says the command graph is demand-gated on
// `ActivationEvents.CommandsRequested`, fired both by the `dx` CLI at boot and by a browser host
// when someone opens the devtools terminal — so activating this module in browser too (with its
// empty list, since there are no browser-safe connector commands) is consistent with that intent.
export const Commands = AppCapability.commands([], { environments: ['node'] });
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'), {
  environments: ['node'],
});
export const OAuthRedirect = Capability.lazyModule(
  'OAuthRedirect',
  { requires: [ConnectorCoordination.ConnectorCoordinator], provides: [], activatesOn: ConnectorEvents.Start },
  () => import('./oauth-redirect'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
  environments: ['node', 'workerd'],
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.dialog', 'org.dxos.role.formInput'],
});
export const Schema = AppCapability.schema(() => import('./schema'), {
  environments: ['node', 'workerd'],
});
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
