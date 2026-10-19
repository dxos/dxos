//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  ClaudeCodeAgent,
  ClaudeCodeEdgeAgent,
  Connector,
  OperationHandler,
  PluginAsset,
  Schema,
  ShellService,
  SkillDefinition,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const ClaudePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(ClaudeCodeAgent),
  Plugin.addModule(ClaudeCodeEdgeAgent),
  Plugin.addModule(Connector),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(Schema),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ShellService),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default ClaudePlugin;
