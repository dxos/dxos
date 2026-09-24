//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { RoutineAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export const Commands = AppCapability.lazyCommands(() => import('./commands.ts'));
export { CreateObject } from './create-object.ts';
export { LayerSpecs } from './layer-specs.ts';
export { OperationHandler } from './operation-handler.ts';
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export { ReactSurface } from './react-surface.ts';
export { RegistrySync } from './registry-sync.ts';
export { Schema } from './schema.ts';
export { Templates } from './templates.ts';
export const Translations = AppCapability.translations(translations);
export { TriggerRuntimeController } from './trigger-runtime-controller.ts';
