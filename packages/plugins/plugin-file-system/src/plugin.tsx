//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  Markdown,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  State,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const FileSystemPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(Markdown),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(State),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default FileSystemPlugin;
