//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { AppGraphBuilder, CreateObject, OperationHandler, ReactSurface, Schema, SettingsModule } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const LingoPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SettingsModule),
  Plugin.addModule(Schema),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default LingoPlugin;
