//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { OperationHandler, PluginAsset, Schema, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

export const SandboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.make,
);

export default SandboxPlugin;
