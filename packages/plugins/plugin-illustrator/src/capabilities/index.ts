//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { CommentConfig } from './comment-config.ts';
export { CreateObject } from './create-object.ts';
export { Migrations } from './migrations.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { Schema } from './schema.ts';
export { SkillDefinition } from './skill-definition.ts';
export { SvgVariant } from './svg-variant.ts';
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const Translations = AppCapability.translations(translations, {
  environments: ['node'],
});
