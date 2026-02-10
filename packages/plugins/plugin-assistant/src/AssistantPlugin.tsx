//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { Chat, Initiative, ResearchGraph } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Sequence } from '@dxos/conductor';
import { Obj, Type } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { Operation } from '@dxos/operation';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { ClientEvents } from '@dxos/plugin-client/types';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space/types';
import { type CreateObject } from '@dxos/plugin-space/types';
import { HasSubject } from '@dxos/types';

import {
  AiService,
  AppGraphBuilder,
  AssistantState,
  BlueprintDefinition,
  EdgeModelResolver,
  LocalModelResolver,
  OperationResolver,
  ReactSurface,
  Repair,
  Settings,
  Toolkit,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { AssistantEvents, AssistantOperation } from './types';

export const AssistantPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addSettingsModule({ activate: Settings }),
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: AssistantState,
  }),
  Common.Plugin.addMetadataModule({
    metadata: [
      {
        id: Type.getTypename(Chat.Chat),
        metadata: {
          icon: 'ph--atom--regular',
          iconHue: 'sky',
          createObject: ((props) => Effect.sync(() => Chat.make(props))) satisfies CreateObject,
        },
      },
      {
        id: Type.getTypename(Blueprint.Blueprint),
        metadata: {
          icon: 'ph--blueprint--regular',
          iconHue: 'sky',
          inputSchema: AssistantOperation.BlueprintForm,
          createObject: ((props) => Effect.sync(() => Blueprint.make(props))) satisfies CreateObject,
        },
      },
      {
        id: Type.getTypename(Prompt.Prompt),
        metadata: {
          icon: 'ph--scroll--regular',
          iconHue: 'sky',
          createObject: ((props) => Effect.sync(() => Prompt.make(props))) satisfies CreateObject,
        },
      },
      {
        id: Type.getTypename(Sequence),
        metadata: {
          icon: 'ph--circuitry--regular',
          iconHue: 'sky',
          createObject: ((props) => Effect.sync(() => Obj.make(Sequence, props))) satisfies CreateObject,
          addToCollectionOnCreate: true,
        },
      },
      {
        id: Type.getTypename(Initiative.Initiative),
        metadata: {
          icon: 'ph--circuitry--regular',
          iconHue: 'sky',
          createObject: ((_, { db }) =>
            Initiative.makeInitialized(
              {
                name: 'New Initiative',
                spec: 'Not specified yet',
              },
              Initiative.makeBlueprint(),
            ).pipe(withComputeRuntime(db.spaceId))) satisfies CreateObject,
          addToCollectionOnCreate: true,
        },
      },
    ],
  }),
  Common.Plugin.addSchemaModule({
    schema: [
      Chat.Chat,
      Chat.CompanionTo,
      Blueprint.Blueprint,
      HasSubject.HasSubject,
      Prompt.Prompt,
      ResearchGraph,
      Initiative.Initiative,
      Sequence,
    ],
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
    activatesOn: ClientEvents.SpacesReady,
    activate: Repair,
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Common.Plugin.addSurfaceModule({
    activate: ReactSurface,
    activatesBefore: [Common.ActivationEvent.SetupArtifactDefinition],
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
    activatesOn: Common.ActivationEvent.Startup,
    activate: AiService,
  }),
  Common.Plugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.addModule({
    // TODO(wittjosiah): Use a different event.
    activatesOn: Common.ActivationEvent.Startup,
    activate: Toolkit,
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
