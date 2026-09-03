//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';

import { meta } from '#meta';
import { translations } from '#translations';
import { ThreadCapabilities, ThreadEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

// The graph builder reads the call manager OPTIONALLY (reactive atom with an absence guard),
// so no spec-level require: a hard cross-plugin require would fail this plugin whenever
// plugin-calls is disabled. Cross-feature requires are only valid with a plugin-level dependsOn.
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
export const ChannelBackendFeed = Capability.lazyModule(
  'ChannelBackendFeed',
  {
    provides: [ThreadCapabilities.ChannelBackend],
    activatesOn: ThreadEvents.Start,
    environments: ['node', 'workerd'],
  },
  () => import('./channel-backend-feed.ts'),
);
// `CreateObjectEntry` carries a `customPanel` React component alongside the object factory, so it
// cannot load without React — browser only.
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'), {
  environments: [],
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const Translations = AppCapability.translations([...translations, ...threadTranslations]);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
