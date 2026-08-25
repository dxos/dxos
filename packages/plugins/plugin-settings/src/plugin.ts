//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { OperationHandler, ReactSurface, SettingsAppGraphBuilder, Translations } from '#capabilities';
import { meta } from '#meta';

export const SettingsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(SettingsAppGraphBuilder),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default SettingsPlugin;
