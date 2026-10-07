//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { OperationHandler, PluginAsset, ReactRoot, SpotlightDismiss, State, Translations } from '#capabilities';
import { meta } from '#meta';

export const SpotlightPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactRoot),
  Plugin.addModule(SpotlightDismiss),
  Plugin.addModule(State),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default SpotlightPlugin;
