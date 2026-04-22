//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Agent, AgentBlueprint, Chat, McpServer, Memory, Plan, ResearchGraph } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Sequence } from '@dxos/conductor';
import { Annotation, Feed, Obj, Type } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { Operation } from '@dxos/operation';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { ClientEvents } from '@dxos/plugin-client/types';
import { DeckEvents } from '@dxos/plugin-deck/types';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject, SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space/types';
import { HasSubject } from '@dxos/types';

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
import { AssistantEvents } from '#types';

import { translations } from './translations';

export const AssistantPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Type.getTypename(Chat.Chat),
        metadata: {
          icon: Annotation.IconAnnotation.get(Chat.Chat).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Chat.Chat).pipe(Option.getOrThrow).hue ?? 'white',
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
        },
      },
      {
        id: Type.getTypename(Blueprint.Blueprint),
        metadata: {
          icon: Annotation.IconAnnotation.get(Blueprint.Blueprint).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Blueprint.Blueprint).pipe(Option.getOrThrow).hue ?? 'white',
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
        },
      },
      {
        id: Type.getTypename(Prompt.Prompt),
        metadata: {
          icon: Annotation.IconAnnotation.get(Prompt.Prompt).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Prompt.Prompt).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Prompt.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
      {
        id: Type.getTypename(Sequence),
        metadata: {
          icon: Annotation.IconAnnotation.get(Sequence).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Sequence).pipe(Option.getOrThrow).hue ?? 'white',
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
        },
      },
      {
        id: Type.getTypename(Agent.Agent),
        metadata: {
          icon: Annotation.IconAnnotation.get(Agent.Agent).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Agent.Agent).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = yield* Agent.makeInitialized({ name: '', spec: '' }, AgentBlueprint.make()).pipe(
                withComputeRuntime(options.db.spaceId),
              );
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
    ],
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [
      Chat.Chat,
      Chat.CompanionTo,
      Blueprint.Blueprint,
      Feed.Feed,
      HasSubject.HasSubject,
      Prompt.Prompt,
      ResearchGraph.ResearchGraph,
      Agent.Agent,
      McpServer.McpServer,
      Plan.Plan,
      Sequence,
      Memory.Memory,
    ],
  }),
  AppPlugin.addSettingsModule({ activate: Settings }),
  AppPlugin.addSurfaceModule({
    activate: ReactSurface,
    activatesBefore: [AppActivationEvents.SetupArtifactDefinition],
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
    activatesBefore: [AssistantEvents.SetupAiServiceProviders],
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
