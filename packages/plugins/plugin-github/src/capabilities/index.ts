//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { Connector } from './connector.ts';
export { MarkdownExtension } from './markdown-extension.ts';
export { LinkResolver } from './link-resolver.ts';
export { GithubAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { OperationHandler } from './operation-handler.ts';
export { Schema } from './schema.ts';
export { ReactSurface } from './react-surface.ts';
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const Translations = AppCapability.translations(translations);
