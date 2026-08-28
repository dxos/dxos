//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CreateObject,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  SettingsModule,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const LingoPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(PluginAsset),
  Plugin.addModule(SettingsModule),
  Plugin.addModule(Schema),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default LingoPlugin;
