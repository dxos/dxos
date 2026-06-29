//
// Copyright 2023 DXOS.org
//

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AiContext } from '@dxos/assistant';
import { Agent, Chat, McpServer, Memory, Plan } from '@dxos/assistant-toolkit';
import { Instructions, Skill } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Feed } from '@dxos/echo';
import { ClientEvents } from '@dxos/plugin-client';
import { DeckEvents } from '@dxos/plugin-deck';
import { MarkdownEvents } from '@dxos/plugin-markdown';
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
import { type AssistantPluginOptions, AssistantEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

const StateReady = AppActivationEvents.createStateEvent(meta.profile.key);

export const AssistantPlugin = Plugin.define<AssistantPluginOptions | void>(meta)
  .pipe(
    AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
    AppPlugin.addNavigationResolverModule({ activatesOn: ClientEvents.ClientReady, activate: NavigationResolver }),
    AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
    AppPlugin.addCreateObjectModule({ activate: CreateObject }),
    AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
    AppPlugin.addSchemaModule({
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
    AppPlugin.addSettingsModule({ activate: Settings }),
    AppPlugin.addSurfaceModule({
      activate: ReactSurface,
      firesBeforeActivation: [AppActivationEvents.SetupArtifactDefinition],
    }),
    AppPlugin.addTranslationsModule({ translations }),
    Plugin.addModule({
      id: 'automation-templates',
      activatesOn: AppActivationEvents.SetupSchema,
      activate: AutomationTemplates,
    }),
    Plugin.addModule({
      id: 'markdown',
      activatesOn: MarkdownEvents.SetupExtensions,
      activate: MarkdownExtension,
    }),
    Plugin.addModule({
      // TODO(wittjosiah): Does not integrate with settings store.
      //   Should this be a different event?
      //   Should settings store be renamed to be more generic?
      activatesOn: AppActivationEvents.SetupSettings,
      firesAfterActivation: [StateReady],
      activate: AssistantState,
    }),
    Plugin.addModule({
      activatesOn: AssistantEvents.SetupAiServiceProviders,
      activate: EdgeModelResolver,
    }),
    Plugin.addModule({
      activatesOn: AssistantEvents.SetupAiServiceProviders,
      activate: LocalModelResolver,
    }),
    Plugin.addModule((options) => ({
      id: Capability.getModuleTag(AiService),
      firesBeforeActivation: [AssistantEvents.SetupAiServiceProviders],
      // TODO(dmaretskyi): This should activate lazily when the AI chat is used.
      activatesOn: ActivationEvents.SetupProcessManager,
      activate: () => AiService(options),
    })),
    Plugin.addModule({
      // Process-affinity `Harness.HarnessService` LayerSpec — needed so operations
      // dispatched as their own processes (e.g. via `Operation.invoke` from
      // `AiSession.createRequest` or `TriggerDispatcher`) can resolve
      // conversation-scoped services without an inline `Effect.provideService`
      // upstream. See `capabilities/ai-context.ts` for the rationale.
      activatesOn: ActivationEvents.SetupProcessManager,
      activate: AiContextCapability,
    }),
    Plugin.addModule({
      activatesOn: ActivationEvents.SetupProcessManager,
      activate: AgentRuntime,
    }),
  )
  .pipe(
    Plugin.addModule({
      // TODO(wittjosiah): Use a different event.
      activatesOn: ActivationEvents.Startup,
      activate: Toolkit,
    }),
    Plugin.addModule({
      activatesOn: ActivationEvents.ProcessManagerReady,
      activate: AgentHydrator,
    }),
    Plugin.addModule({
      activatesOn: ActivationEvent.allOf(
        ActivationEvents.ProcessManagerReady,
        AppActivationEvents.AppGraphReady,
        DeckEvents.StateReady,
        StateReady,
      ),
      activate: CompanionChatProvisioner,
    }),
    Plugin.addModule({
      activatesOn: ClientEvents.SetupMigration,
      activate: Migrations,
    }),
    Plugin.addModule({
      activatesOn: AppActivationEvents.SetupConnectors,
      activate: Connector,
    }),
    AppPlugin.addPluginAssetModule({
      asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
    }),
    Plugin.make,
  );

export default AssistantPlugin;
