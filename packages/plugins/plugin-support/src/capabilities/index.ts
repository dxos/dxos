//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { SupportAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export { Schema } from './schema.ts';
export { SkillDefinition } from './skill-definition.ts';
export { CreateObject } from './create-object.ts';
export { HelpState } from './help-state.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactRoot } from './react-root.tsx';
export { SupportTour as Tour } from './tour.ts';
export { ReactSurface } from './react-surface.ts';
export { SupportSettings } from './settings.ts';
export { TourAutoStart } from './tour-auto-start.ts';
export const Translations = AppCapability.translations(translations);
