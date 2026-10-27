//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  BuildRunState,
  CreateObject,
  McpServer,
  NavigationTargetResolver,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  Settings as SettingsCapability,
  SkillDefinition,
  SpecSync,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const CodePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(BuildRunState),
  Plugin.addModule(CreateObject),
  Plugin.addModule(McpServer),
  Plugin.addModule(NavigationTargetResolver),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SettingsCapability),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(SpecSync),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default CodePlugin;
