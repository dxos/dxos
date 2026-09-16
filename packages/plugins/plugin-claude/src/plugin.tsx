//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { OperationHandler, PluginAsset, Schema, SkillDefinition, Translations } from '#capabilities';
import { meta } from '#meta';

export const ClaudePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(PluginAsset),
  Plugin.addModule(Schema),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default ClaudePlugin;
