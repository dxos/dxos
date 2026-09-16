//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  Commands,
  CreateObject,
  Dashboard,
  IdentityCreated,
  NavigationHandler,
  NavigationTargetResolver,
  ObservabilityMappings,
  OperationHandler,
  PluginAsset,
  ReactRoot,
  ReactSurface,
  Repair,
  Schema,
  SettingsSync,
  SkillDefinition,
  SpaceSettings,
  SpacesReady,
  SpaceState,
  Translations,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';
import { SpaceSchema } from '#types';

export const SpacePlugin = Plugin.define<SpaceSchema.SpacePluginOptions>(meta)
  .pipe(
    Plugin.addModule(AppGraphBuilder),
    // TODO(wittjosiah): Could some of these commands make use of operations?
    Plugin.addModule(Commands),
    Plugin.addModule(CreateObject),
    Plugin.addModule(Dashboard),
    Plugin.addModule(IdentityCreated),
    Plugin.addModule(NavigationHandler),
    Plugin.addModule(NavigationTargetResolver),
    Plugin.addModule(ObservabilityMappings),
    Plugin.addModule(OperationHandler),
    Plugin.addModule(PluginAsset),
    Plugin.addModule(ReactRoot),
    Plugin.addModule(ReactSurface),
    Plugin.addModule(Repair),
    Plugin.addModule(Schema),
    Plugin.addModule(SettingsSync),
    Plugin.addModule(SkillDefinition),
    Plugin.addModule(SpaceSettings),
    Plugin.addModule(SpacesReady),
    Plugin.addModule(SpaceState),
  )
  // `pipe` has overloads only up to 20 arguments, and this plugin has more modules than that.
  .pipe(Plugin.addModule(Translations), Plugin.addModule(UndoMappings), Plugin.make);

export default SpacePlugin;
