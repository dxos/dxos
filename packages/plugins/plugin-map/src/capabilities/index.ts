//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { MapAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { Schema } from './schema.ts';
export { SkillDefinition } from './skill-definition.ts';
export { CreateObject } from './create-object.ts';
export { MarkerProvider } from './marker-provider.tsx';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { MapSettings } from './settings.ts';
export { MapState } from './state.ts';
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
