//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { ResearchGraph } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Sequence } from '@dxos/conductor';
import { Obj, Type } from '@dxos/echo';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { type CreateObject } from '@dxos/plugin-space/types';
import { HasSubject } from '@dxos/types';

import {
  AiService,
  AppGraphBuilder,
  AssistantState,
  BlueprintDefinition,
  EdgeModelResolver,
  IntentResolver,
  LocalModelResolver,
  OperationResolver,
  ReactSurface,
  Repair,
  Settings,
  Toolkit,
} from './capabilities';
import { AssistantEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';
import { Assistant, AssistantAction, AssistantOperation } from './types';

export const AssistantPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addSettingsModule({ activate: Settings }),
  Plugin.addModule({
    id: 'state',
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: AssistantState,
  }),
  Common.Plugin.addMetadataModule({
    metadata: [
      {
        id: Type.getTypename(Assistant.Chat),
        metadata: {
          icon: 'ph--atom--regular',
          iconHue: 'sky',
          createObject: ((props) => Effect.sync(() => Assistant.make(props))) satisfies CreateObject,
        },
      },
      {
        id: Type.getTypename(Blueprint.Blueprint),
        metadata: {
          icon: 'ph--blueprint--regular',
          iconHue: 'sky',
          inputSchema: AssistantAction.BlueprintForm,
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
    ],
  }),
  Common.Plugin.addSchemaModule({
    schema: [
      Assistant.Chat,
      Assistant.CompanionTo,
      Blueprint.Blueprint,
      HasSubject.HasSubject,
      Prompt.Prompt,
      ResearchGraph,
      Sequence,
    ],
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: (context) =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) => {
          const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
          return invoke(AssistantOperation.OnCreateSpace, params);
        }),
      ),
  }),
  Plugin.addModule({
    id: 'repair',
    activatesOn: ClientEvents.SpacesReady,
    activate: Repair,
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Common.Plugin.addSurfaceModule({
    activate: ReactSurface,
    activatesBefore: [Common.ActivationEvent.SetupArtifactDefinition],
  }),
  Plugin.addModule({
    id: 'edge-model-resolver',
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: EdgeModelResolver,
  }),
  Plugin.addModule({
    id: 'local-model-resolver',
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: LocalModelResolver,
  }),
  Plugin.addModule({
    id: 'ai-service',
    activatesBefore: [AssistantEvents.SetupAiServiceProviders],
    // TODO(dmaretskyi): This should activate lazily when the AI chat is used.
    activatesOn: Common.ActivationEvent.Startup,
    activate: AiService,
  }),
  Common.Plugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.addModule({
    id: 'toolkit',
    // TODO(wittjosiah): Use a different event.
    activatesOn: Common.ActivationEvent.Startup,
    activate: Toolkit,
  }),
  Plugin.make,
);
