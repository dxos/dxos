//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineEvents from '@dxos/plugin-routine/RoutineEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { ConnectorCoordination, ConnectorEvents, ConnectorSpec } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export * from './connector-coordinator/index.ts';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  requires: [ConnectorSpec.Connector],
  environments: ['node'],
});
export const BuiltinConnectors = Capability.lazyModule(
  'BuiltinConnectors',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connectors.ts'),
);
// `#commands` resolves to `commands.browser.ts` under the browser: `connector oauth` needs a Bun
// callback server, so only headless runtimes get the real command graph.
export const Commands = AppCapability.commands(() => import('#commands'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'), {
  environments: ['node'],
});
export const OAuthRedirect = Capability.lazyModule(
  'OAuthRedirect',
  {
    requires: [ConnectorCoordination.ConnectorCoordinator],
    provides: [],
    activatesOn: ConnectorEvents.Start,
    environments: [],
  },
  () => import('./oauth-redirect.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const RoutineTemplate = Capability.lazyModule(
  'RoutineTemplate',
  { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
  () => import('./routine-template.ts'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.dialog', 'org.dxos.role.formInput'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
