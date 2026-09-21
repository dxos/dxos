//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { CommentConfig } from './comment-config.ts';
// Browser-only: the entry supplies `CreateDrawingPanel`, the React form that picks the drawing
// variant and collects its input.
export { CreateObject } from './create-object.ts';
// Migration providers stay eager: a migration missing when a space opens is a data hazard.
export { Migrations } from './migrations.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { Schema } from './schema.ts';
export { SkillDefinition } from './skill-definition.ts';
// Browser-only: the variant supplies the React article/card components that render a drawing.
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
