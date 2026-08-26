//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  BuiltinConnectors,
  Commands,
  Coordinator,
  CreateObject,
  OAuthRedirect,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  RoutineTemplate,
  Schema,
  SkillDefinition,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(BuiltinConnectors),
  Plugin.addModule(Commands),
  Plugin.addModule(Coordinator),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OAuthRedirect),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(RoutineTemplate),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default ConnectorPlugin;
