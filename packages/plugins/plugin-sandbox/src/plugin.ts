//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CreateObject,
  LocalLauncher,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  SandboxLayer,
  Schema,
  Settings,
  SkillDefinition,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const SandboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CreateObject),
  Plugin.addModule(LocalLauncher),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(SandboxLayer),
  Plugin.addModule(Schema),
  Plugin.addModule(Settings),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default SandboxPlugin;
