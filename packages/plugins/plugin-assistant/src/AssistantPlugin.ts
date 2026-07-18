//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { AiContext } from '@dxos/assistant';
import { Agent, Chat, McpServer, Memory, Plan } from '@dxos/assistant-toolkit';
import { Instructions, Skill } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Feed } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { HasSubject, Message } from '@dxos/types';

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
  Migrations,
  NavigationResolver,
  OperationHandler,
  ReactSurface,
  Settings,
  SkillDefinition,
  Toolkit,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { type AssistantPluginOptions } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const AssistantPlugin = Plugin.define<AssistantPluginOptions | void>(meta)
  .pipe(
    AppPlugin.addAppGraphModule<AssistantPluginOptions | void>({
      requires: AppGraphBuilder.requires,
      provides: AppGraphBuilder.provides,
      activate: AppGraphBuilder,
    }),
    AppPlugin.addNavigationResolverModule({
      requires: NavigationResolver.requires,
      provides: NavigationResolver.provides,
      activate: NavigationResolver,
    }),
    AppPlugin.addSkillDefinitionModule<AssistantPluginOptions | void>({
      requires: SkillDefinition.requires,
      provides: SkillDefinition.provides,
      activate: SkillDefinition,
    }),
    AppPlugin.addCreateObjectModule<AssistantPluginOptions | void>({
      requires: CreateObject.requires,
      provides: CreateObject.provides,
      activate: CreateObject,
    }),
    AppPlugin.addOperationHandlerModule<AssistantPluginOptions | void>({
      requires: OperationHandler.requires,
      provides: OperationHandler.provides,
      activate: OperationHandler,
    }),
    AppPlugin.addSchemaModule<AssistantPluginOptions | void>({
      schema: [
        Chat.Chat,
        Chat.CompanionTo,
        Skill.Skill,
        AiContext.Binding,
        Feed.Feed,
        HasSubject.HasSubject,
        Message.Message,
        Instructions.Instructions,
        Agent.Agent,
        McpServer.McpServer,
        Plan.Plan,
        Sequence.Sequence,
        Memory.Memory,
        Text.Text,
      ],
    }),
    AppPlugin.addSettingsModule<AssistantPluginOptions | void>({
      requires: Settings.requires,
      provides: Settings.provides,
      activate: Settings,
    }),
    AppPlugin.addSurfaceModule<AssistantPluginOptions | void>({
      requires: ReactSurface.requires,
      provides: ReactSurface.provides,
      activate: ReactSurface,
    }),
    AppPlugin.addTranslationsModule<AssistantPluginOptions | void>({ translations }),
    Plugin.addLazyModule(AutomationTemplates, { id: 'automation-templates' }),
    Plugin.addLazyModule(MarkdownExtension, { id: 'markdown' }),
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    Plugin.addLazyModule(AssistantState),
    Plugin.addLazyModule(EdgeModelResolver),
    Plugin.addLazyModule(LocalModelResolver),
    Plugin.addLazyModule(AiService),
    // Process-affinity `Harness.HarnessService` LayerSpec — needed so operations
    // dispatched as their own processes (e.g. via `Operation.invoke` from
    // `AiSession.createRequest` or `TriggerDispatcher`) can resolve
    // conversation-scoped services without an inline `Effect.provideService`
    // upstream. See `capabilities/ai-context.ts` for the rationale.
    Plugin.addLazyModule(AiContextCapability),
    Plugin.addLazyModule(AgentRuntime),
  )
  .pipe(
    Plugin.addLazyModule(Toolkit),
    Plugin.addLazyModule(AgentHydrator),
    Plugin.addLazyModule(CompanionChatProvisioner),
    Plugin.addLazyModule(Migrations),
    Plugin.addLazyModule(Connector),
    AppPlugin.addPluginAssetModule<AssistantPluginOptions | void>({
      asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
    }),
    Plugin.make,
  );

export default AssistantPlugin;
