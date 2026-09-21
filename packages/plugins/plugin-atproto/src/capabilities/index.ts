//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { AtprotoAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { AtprotoConnector } from './connector.ts';
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export { ReactSurface } from './react-surface.ts';
export { RepoLayer } from './repo-layer.ts';
export { Schema } from './schema.ts';
export const Translations = AppCapability.translations(translations);
