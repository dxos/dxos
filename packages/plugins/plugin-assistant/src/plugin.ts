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
  AssistantState,
  AutomationTemplates,
  CompanionChatProvisioner,
  Connector,
  CreateObject,
  EdgeModelResolver,
  LocalModelResolver,
  MarkdownExtension,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  Settings,
  SkillDefinition,
  SubjectContext,
  Toolkit,
  Translations,
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
    Plugin.addModule(Settings),
    Plugin.addModule(ReactSurface),
    Plugin.addModule(Translations),
    Plugin.addModule(AutomationTemplates),
    Plugin.addModule(MarkdownExtension),
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    Plugin.addModule(AssistantState),
    Plugin.addModule(EdgeModelResolver),
    Plugin.addModule(LocalModelResolver),
    Plugin.addModule(AiService),
    // Process-affinity `Harness.HarnessService` LayerSpec — needed so operations
    // dispatched as their own processes (e.g. via `Operation.invoke` from
    // `AiSession.createRequest` or `TriggerDispatcher`) can resolve
    // conversation-scoped services without an inline `Effect.provideService`
    // upstream. See `capabilities/ai-context.ts` for the rationale.
    Plugin.addModule(AiContextCapability),
    Plugin.addModule(AgentRuntime),
  )
  .pipe(
    Plugin.addModule(Toolkit),
    Plugin.addModule(AgentHydrator),
    Plugin.addModule(CompanionChatProvisioner),
    Plugin.addModule(SubjectContext),
    Plugin.addModule(Connector),
    Plugin.addModule(PluginAsset),
    Plugin.make,
  );

export default AssistantPlugin;
