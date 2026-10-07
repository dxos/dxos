//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { OperationHandler, PluginAsset, ProjectTemplates, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

export const ComputerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(PluginAsset),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ProjectTemplates),
  Plugin.make,
);

export default ComputerPlugin;
