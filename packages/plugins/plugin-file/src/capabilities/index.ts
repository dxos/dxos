//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { Schema } from './schema.ts';
export { SkillDefinition } from './skill-definition.ts';
export { CreateObject } from './create-object.ts';
export { EdgeBackend } from './edge-backend.ts';
export { FileUploader } from './file-uploader.ts';
export { InlineBackend } from './inline-backend.ts';
export { Markdown } from './markdown-extension.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { FileSettings as Settings } from './settings.ts';
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
