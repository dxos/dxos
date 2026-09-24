//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { AnchorSort } from './anchor-sort.ts';
export { CommentConfig } from './comment-config.ts';
export { ComputeGraphRegistry } from './compute-graph-registry.ts';
export { CreateObject } from './create-object.ts';
export { Markdown } from './markdown-extension.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { Schema } from './schema.ts';
export { SheetState } from './state.ts';
export { SkillDefinition } from './skill-definition.ts';
export { UndoMappings } from './undo-mappings.ts';
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
