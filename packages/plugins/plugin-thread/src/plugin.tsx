//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  ChannelBackendFeed,
  CreateObject,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

// TODO(wittjosiah): Rename to ChatPlugin.

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const ThreadPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Schema),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  // Default local-feed channel backend. Other plugins contribute additional
  // `ChannelBackend` providers (e.g. ATProto) earlier in plugin order.
  Plugin.addModule(ChannelBackendFeed),
  Plugin.addModule(PluginAsset),
  Plugin.make,
);

export default ThreadPlugin;
