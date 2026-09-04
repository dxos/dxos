//
// Copyright 2025 DXOS.org
//

import { setAutoFreeze } from 'immer';

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CheckAppScheme,
  DeckSettings,
  DeckState,
  NotificationTracker,
  OperationHandler,
  PluginAsset,
  ReactRoot,
  ReactSurface,
  Translations,
  UrlHandler,
} from '#capabilities';
import { meta } from '#meta';
import type { DeckCapabilities } from '#types';

// NOTE(Zan): When producing values with immer, we shouldn't auto-freeze them because
//   our signal implementation needs to add some hidden properties to the produced values.
// TODO(Zan): Move this to a more global location if we use immer more broadly.
setAutoFreeze(false);

export const DeckPlugin = Plugin.define<DeckCapabilities.DeckPluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CheckAppScheme),
  Plugin.addModule(DeckSettings),
  Plugin.addModule(DeckState),
  Plugin.addModule(NotificationTracker),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactRoot),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.addModule(UrlHandler),
  Plugin.make,
);

export default DeckPlugin;
