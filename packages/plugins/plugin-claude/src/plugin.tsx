//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AgentLauncher,
  ClaudeCodeAgent,
  ClaudeCodeEdgeAgent,
  Connector,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  Settings,
  ShellService,
  SkillDefinition,
  State,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const ClaudePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AgentLauncher),
  Plugin.addModule(ClaudeCodeAgent),
  Plugin.addModule(ClaudeCodeEdgeAgent),
  Plugin.addModule(Connector),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Settings),
  Plugin.addModule(ShellService),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(State),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default ClaudePlugin;
