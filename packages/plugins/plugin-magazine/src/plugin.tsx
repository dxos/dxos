//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CreateObject,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  RoutineTemplates,
  Schema,
  SkillDefinition,
  TextContent,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const MagazinePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(RoutineTemplates),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(TextContent),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default MagazinePlugin;
