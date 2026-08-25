//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  CrxSettings,
  InstallPageActions,
  OperationHandler,
  PageActionProvider,
  PluginAsset,
  ReactSurface,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const CrxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CrxSettings),
  Plugin.addModule(InstallPageActions),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PageActionProvider),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default CrxPlugin;
