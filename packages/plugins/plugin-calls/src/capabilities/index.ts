//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { CallsAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { CallsCallManager as CallManager } from './call-manager.ts';
export { CallTransport } from './call-transport.ts';
export { ReactRoot } from './react-root.ts';
export { ReactSurface } from './react-surface.ts';
export const Translations = AppCapability.translations(translations, { environments: ['node'] });
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
