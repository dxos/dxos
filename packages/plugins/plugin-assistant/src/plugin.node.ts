//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AgentHydrator,
  AgentRuntime,
  AiContext as AiContextCapability,
  AiService,
  AppGraphBuilder,
  CreateObject,
  EdgeModelResolver,
  LocalModelResolver,
  OperationHandler,
  Schema,
  SkillDefinition,
  Toolkit,
} from '#capabilities';
import { meta } from '#meta';
import { AssistantOptions } from '#types';

export const AssistantPlugin = Plugin.define<AssistantOptions.AssistantPluginOptions | void>(meta)
  .pipe(
    Plugin.addModule(AppGraphBuilder),
    Plugin.addModule(SkillDefinition),
    Plugin.addModule(CreateObject),
    Plugin.addModule(OperationHandler),
    Plugin.addModule(Schema),
    Plugin.addModule(EdgeModelResolver),
    Plugin.addModule(LocalModelResolver),
    Plugin.addModule(AiService),
    Plugin.addModule(AiContextCapability),
    Plugin.addModule(Toolkit),
    Plugin.addModule(AgentRuntime),
  )
  .pipe(Plugin.addModule(AgentHydrator), Plugin.make);

export default AssistantPlugin;
