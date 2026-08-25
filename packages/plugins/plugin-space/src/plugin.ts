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
  ObservabilityMappings,
  OperationHandler,
  PluginAsset,
  ReactRoot,
  ReactSurface,
  Repair,
  Schema,
  SkillDefinition,
  SpaceSettings,
  SpacesReady,
  SpaceState,
  Translations,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';
import { SpaceSchema } from '#types';

export const SpacePlugin = Plugin.define<SpaceSchema.SpacePluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  // TODO(wittjosiah): Could some of these commands make use of operations?
  Plugin.addModule(Commands),
  Plugin.addModule(CreateObject),
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
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(SpaceSettings),
  Plugin.addModule(SpacesReady),
  Plugin.addModule(SpaceState),
  Plugin.addModule(Translations),
  Plugin.addModule(UndoMappings),
  Plugin.make,
);

export default SpacePlugin;
