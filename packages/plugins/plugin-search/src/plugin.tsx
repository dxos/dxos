//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { AppGraphBuilder, OperationHandler, PluginAsset, ReactSurface, Translations } from '#capabilities';
import { meta } from '#meta';

// TODO(wittjosiah): Fold into space plugin?
export const SearchPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default SearchPlugin;
