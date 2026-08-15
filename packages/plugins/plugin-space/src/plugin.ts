//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  Commands,
  CreateObject,
  IdentityCreated,
  NavigationHandler,
  NavigationTargetResolver,
  OperationHandler,
  PluginAsset,
  ReactRoot,
  ReactSurface,
  Repair,
  Schema,
  SpaceSettings,
  SpacesReady,
  SpaceState,
  Translations,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';
import { SpaceSchema } from '#types';

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const SpacePlugin = Plugin.define<SpaceSchema.SpacePluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  // TODO(wittjosiah): Could some of these commands make use of operations?
  Plugin.addModule(Commands),
  Plugin.addModule(CreateObject),
  Plugin.addModule(IdentityCreated),
  Plugin.addModule(NavigationHandler),
  Plugin.addModule(NavigationTargetResolver),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactRoot),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Repair),
  Plugin.addModule(Schema),
  Plugin.addModule(SpaceSettings),
  Plugin.addModule(SpacesReady),
  Plugin.addModule(SpaceState),
  Plugin.addModule(Translations),
  Plugin.addModule(UndoMappings),
  Plugin.make,
);

export default SpacePlugin;
