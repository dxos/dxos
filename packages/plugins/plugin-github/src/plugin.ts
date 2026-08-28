//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Connector, MarkdownExtension, OperationHandler, PluginAsset, Translations } from '#capabilities';
import { meta } from '#meta';

export const GitHubPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Connector),
  Plugin.addModule(MarkdownExtension),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default GitHubPlugin;
