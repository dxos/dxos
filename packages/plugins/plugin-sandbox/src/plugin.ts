//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { OperationHandler, PluginAsset, SandboxLayer, Schema, Settings, SkillDefinition } from '#capabilities';
import { LocalLauncher } from '#local-launcher';
import { meta } from '#meta';

export const SandboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(LocalLauncher),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(SandboxLayer),
  Plugin.addModule(Schema),
  Plugin.addModule(Settings),
  Plugin.addModule(SkillDefinition),
  Plugin.make,
);

export default SandboxPlugin;
