//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { DeckAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { CheckAppScheme } from './check-app-scheme.ts';
export { NotificationTracker } from './notification-tracker.ts';
export { GraphRetention } from './graph-retention.ts';
export { OperationHandler } from './operation-handler.ts';
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export { ReactRoot } from './react-root.tsx';
export { ReactSurface } from './react-surface.ts';
export { DeckSettings } from './settings.ts';
export { DeckState } from './state.ts';
export const Translations = AppCapability.translations(translations);
export { UrlHandler } from './url-handler.ts';
