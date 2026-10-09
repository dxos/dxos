//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { RoutineCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  environments: ['browser', 'node', 'tauri'],
});
export const Commands = AppCapability.commands(() => import('./commands.ts'));
// The entry carries a live `customPanel` (`CreateRoutinePanel`) alongside the object factory, so the
// module cannot be evaluated without React.
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'), {
  environments: ['browser', 'tauri'],
});
export const LayerSpecs = AppCapability.layerSpec(() => import('./layer-specs.ts'), {
  name: 'LayerSpecs',
  provides: [Capabilities.TraceSink],
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'));
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent'],
});
export const RegistrySync = Capability.lazyModule(
  'RegistrySync',
  {
    requires: [
      ClientCapabilities.Client,
      Capabilities.AtomRegistry,
      AppCapabilities.SkillDefinition,
      Capabilities.OperationHandler,
    ],
    provides: [],
    environments: ['browser', 'node', 'tauri'],
  },
  () => import('./registry-sync.ts'),
);
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const Templates = Capability.lazyModule(
  'Templates',
  { provides: [RoutineCapabilities.Template], environments: ['browser', 'node', 'tauri', 'workerd'] },
  () => import('./templates.ts'),
);
export const Translations = AppCapability.translations(translations);
export const TriggerRuntimeController = Capability.lazyModule(
  'TriggerRuntimeController',
  {
    requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime],
    provides: [],
    // Runtime event: triggers only need to react to spaces once the client observes them.
    activatesOn: ClientEvents.SpacesAvailable,
    environments: ['browser', 'node', 'tauri'],
  },
  () => import('./trigger-runtime-controller.ts'),
);
