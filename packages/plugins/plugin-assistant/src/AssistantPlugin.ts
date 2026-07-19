//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
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
    Plugin.addLazyModule(AppGraphBuilder),
    Plugin.addLazyModule(NavigationResolver),
    Plugin.addLazyModule(SkillDefinition),
    Plugin.addLazyModule(CreateObject),
    Plugin.addLazyModule(OperationHandler),
    Plugin.addLazyModule(
      AppCapability.schema([
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
      ]),
    ),
    Plugin.addLazyModule(Settings),
    Plugin.addLazyModule(ReactSurface),
    Plugin.addLazyModule(AppCapability.translations(translations)),
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
    Plugin.addLazyModule(
      AppCapability.pluginAsset({
        pluginId: meta.profile.key,
        path: 'PLUGIN.mdl',
        content: pluginSpec,
        mimeType: 'application/x-mdl',
      }),
    ),
    Plugin.make,
  );

export default AssistantPlugin;
