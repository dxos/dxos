//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { MagazineAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { RoutineTemplates } from './routine-templates.ts';
export { Schema } from './schema.ts';
export { TextContent } from './text-content.ts';
export { SkillDefinition } from './skill-definition.ts';
export { CreateObject } from './create-object.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
