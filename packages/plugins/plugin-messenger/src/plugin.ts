//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  InboxMaterializer,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  Sender,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const MessengerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(InboxMaterializer),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(Sender),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default MessengerPlugin;
