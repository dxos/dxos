//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  AtprotoConnector,
  PluginAsset,
  ReactSurface,
  RepoLayer,
  Schema,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const AtprotoPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(AtprotoConnector),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(RepoLayer),
  Plugin.addModule(Schema),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default AtprotoPlugin;
