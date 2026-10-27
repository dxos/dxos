//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Recorder,
  Schema,
  Settings,
  Translations,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';

export const RecorderPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Recorder),
  Plugin.addModule(Schema),
  Plugin.addModule(Settings),
  Plugin.addModule(Translations),
  Plugin.addModule(UndoMappings),
  Plugin.make,
);

export default RecorderPlugin;
