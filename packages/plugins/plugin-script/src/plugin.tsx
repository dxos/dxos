//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  Compiler,
  CreateObject,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  ScriptSettings,
  SkillDefinition,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const ScriptPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(Compiler),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(ScriptSettings),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default ScriptPlugin;
