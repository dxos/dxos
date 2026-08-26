//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  Commands,
  DevPluginLoader,
  OperationHandler,
  ReactSurface,
  RegistrySettings,
  SkillDefinition,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const RegistryPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(Commands),
  Plugin.addModule(DevPluginLoader),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(RegistrySettings),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default RegistryPlugin;
