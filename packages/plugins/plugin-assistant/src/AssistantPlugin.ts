//
// Copyright 2023 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
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

// Legacy compat window kept for any straggling unmigrated listener; the sole in-plugin
// consumer (CompanionChatProvisioner) now requires `AssistantCapabilities.State` directly.
const StateReady = AppActivationEvents.createStateEvent(meta.profile.key);

export const AssistantPlugin = Plugin.define<AssistantPluginOptions | void>(meta)
  .pipe(
    AppPlugin.addAppGraphModule({
      requires: AppGraphBuilder.requires,
      provides: AppGraphBuilder.provides,
      activate: AppGraphBuilder,
    }),
    AppPlugin.addNavigationResolverModule({
      requires: NavigationResolver.requires,
      provides: NavigationResolver.provides,
      activate: NavigationResolver,
    }),
    AppPlugin.addSkillDefinitionModule({
      requires: SkillDefinition.requires,
      provides: SkillDefinition.provides,
      activate: SkillDefinition,
    }),
    AppPlugin.addCreateObjectModule({
      requires: CreateObject.requires,
      provides: CreateObject.provides,
      activate: CreateObject,
    }),
    AppPlugin.addOperationHandlerModule({
      requires: OperationHandler.requires,
      provides: OperationHandler.provides,
      activate: OperationHandler,
    }),
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
    AppPlugin.addSettingsModule({ requires: Settings.requires, provides: Settings.provides, activate: Settings }),
    AppPlugin.addSurfaceModule({
      requires: ReactSurface.requires,
      provides: ReactSurface.provides,
      activate: ReactSurface,
    }),
    AppPlugin.addTranslationsModule({ translations }),
    Plugin.addModule({
      id: 'automation-templates',
      requires: AutomationTemplates.requires,
      provides: AutomationTemplates.provides,
      activate: AutomationTemplates,
    }),
    Plugin.addModule({
      id: 'markdown',
      requires: MarkdownExtension.requires,
      provides: MarkdownExtension.provides,
      activate: MarkdownExtension,
    }),
    Plugin.addModule({
      // TODO(wittjosiah): Does not integrate with settings store.
      //   Should this be a different event?
      //   Should settings store be renamed to be more generic?
      requires: AssistantState.requires,
      provides: AssistantState.provides,
      // Migration bridge for any unmigrated `StateReady` listener.
      compatFires: [StateReady],
      activate: AssistantState,
    }),
    Plugin.addModule({
      requires: EdgeModelResolver.requires,
      provides: EdgeModelResolver.provides,
      activate: EdgeModelResolver,
    }),
    Plugin.addModule({
      requires: LocalModelResolver.requires,
      provides: LocalModelResolver.provides,
      activate: LocalModelResolver,
    }),
    Plugin.addModule((options) => ({
      id: Capability.getModuleTag(AiService),
      requires: AiService.requires,
      provides: AiService.provides,
      activate: () => AiService(options),
    })),
    Plugin.addModule({
      // Process-affinity `Harness.HarnessService` LayerSpec — needed so operations
      // dispatched as their own processes (e.g. via `Operation.invoke` from
      // `AiSession.createRequest` or `TriggerDispatcher`) can resolve
      // conversation-scoped services without an inline `Effect.provideService`
      // upstream. See `capabilities/ai-context.ts` for the rationale.
      requires: AiContextCapability.requires,
      provides: AiContextCapability.provides,
      activate: AiContextCapability,
    }),
    Plugin.addModule({
      requires: AgentRuntime.requires,
      provides: AgentRuntime.provides,
      activate: AgentRuntime,
    }),
  )
  .pipe(
    Plugin.addModule({
      requires: Toolkit.requires,
      provides: Toolkit.provides,
      activate: Toolkit,
    }),
    Plugin.addModule({
      requires: AgentHydrator.requires,
      provides: AgentHydrator.provides,
      activate: AgentHydrator,
    }),
    Plugin.addModule({
      requires: CompanionChatProvisioner.requires,
      provides: CompanionChatProvisioner.provides,
      activate: CompanionChatProvisioner,
    }),
    Plugin.addModule({
      requires: Migrations.requires,
      provides: Migrations.provides,
      activate: Migrations,
    }),
    Plugin.addModule({
      requires: Connector.requires,
      provides: Connector.provides,
      activate: Connector,
    }),
    AppPlugin.addPluginAssetModule({
      asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
    }),
    Plugin.make,
  );

export default AssistantPlugin;
