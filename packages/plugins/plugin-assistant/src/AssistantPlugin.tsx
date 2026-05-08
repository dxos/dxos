//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ContextBinding } from '@dxos/assistant';
import { Agent, AgentBlueprint, Chat, McpServer, Memory, Plan } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Routine } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Feed, Obj } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { ClientEvents } from '@dxos/plugin-client/types';
import { DeckEvents } from '@dxos/plugin-deck/types';
import { MarkdownEvents } from '@dxos/plugin-markdown/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, SpaceEvents, type CreateObject } from '@dxos/plugin-space/types';
import { Text } from '@dxos/schema';
import { HasSubject, Message } from '@dxos/types';

import {
  AiService,
  AppGraphBuilder,
  AssistantState,
  BlueprintDefinition,
  CompanionChatProvisioner,
  EdgeModelResolver,
  LocalModelResolver,
  MarkdownExtension,
  Migrations,
  OperationHandler,
  ReactSurface,
  Settings,
  Toolkit,
} from '#capabilities';
import { meta } from '#meta';
import { AssistantOperation } from '#operations';
import { translations } from '#translations';
import { AssistantEvents } from '#types';

export const AssistantPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.addModule({
    id: 'create-objects',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return [
        Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
          id: Chat.Chat.typename,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const { object } = yield* Operation.invoke(AssistantOperation.CreateChat, {
                db: options.db,
                name: props?.name,
              });
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        }),
        Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
          id: Blueprint.Blueprint.typename,
          inputSchema: AssistantOperation.BlueprintForm,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Blueprint.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        }),
        Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
          id: Routine.Routine.typename,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Routine.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        }),
        Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
          id: Sequence.typename,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Obj.make(Sequence, props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        }),
        Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
          id: Agent.Agent.typename,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = yield* Agent.makeInitialized({ name: '', instructions: '' }, AgentBlueprint.make()).pipe(
                withComputeRuntime(options.db.spaceId),
              );
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        }),
      ];
    }),
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [
      Chat.Chat,
      Chat.CompanionTo,
      Blueprint.Blueprint,
      ContextBinding,
      Feed.Feed,
      HasSubject.HasSubject,
      Message.Message,
      Routine.Routine,
      Agent.Agent,
      McpServer.McpServer,
      Plan.Plan,
      Sequence,
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
    id: 'markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: MarkdownExtension,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: AppActivationEvents.SetupSettings,
    activate: AssistantState,
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(AssistantOperation.OnCreateSpace, params),
        ),
      ),
  }),
  Plugin.addModule({
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: EdgeModelResolver,
  }),
  Plugin.addModule({
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: LocalModelResolver,
  }),
  Plugin.addModule({
    firesBeforeActivation: [AssistantEvents.SetupAiServiceProviders],
    // TODO(dmaretskyi): This should activate lazily when the AI chat is used.
    activatesOn: ActivationEvents.Startup,
    activate: AiService,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): Use a different event.
    activatesOn: ActivationEvents.Startup,
    activate: Toolkit,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(
      ActivationEvents.OperationInvokerReady,
      AppActivationEvents.AppGraphReady,
      DeckEvents.StateReady,
    ),
    activate: CompanionChatProvisioner,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.SetupMigration,
    activate: Migrations,
  }),
  Plugin.make,
);

// TODO(dmaretskyi): Extract to a helper module.
const withComputeRuntime =
  (spaceId: SpaceId) =>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E, Exclude<R, AutomationCapabilities.ComputeServices> | Capability.Service> =>
    Effect.gen(function* () {
      // TODO(dmaretskyi): Capability.get has `Error` in the error channel. We should throw those as defects instead.
      const provider = yield* Capability.get(AutomationCapabilities.ComputeRuntime).pipe(Effect.orDie);
      const runtime = yield* provider.getRuntime(spaceId).runtimeEffect;
      return yield* effect.pipe(Effect.provide(runtime));
    });

export default AssistantPlugin;
