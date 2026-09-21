//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { DebugAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { ReactSurface } from './react-surface.ts';
export { DebugSettings } from './settings.ts';
export { GraphRetention } from './graph-retention.ts';
export { StatsPanel } from './stats-panel.ts';
export { OperationHandler } from './operation-handler.ts';
export { MarkdownMenu } from './markdown-menu.ts';
export const SpaceTemplates = AppCapability.lazySpaceTemplates(() => import('./space-templates.ts'));
export { LogRecording } from './log-recording.ts';
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
