//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  Connector,
  LinkResolver,
  MarkdownExtension,
  OperationHandler,
  PageActionProvider,
  PluginAsset,
  ReactSurface,
  Schema,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const GitHubPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(Connector),
  Plugin.addModule(LinkResolver),
  Plugin.addModule(MarkdownExtension),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PageActionProvider),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default GitHubPlugin;
