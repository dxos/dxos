//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  Expose,
  Keyboard,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  State,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const NavTreePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(Expose),
  Plugin.addModule(Keyboard),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(State),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default NavTreePlugin;
