//
// Copyright 2023 DXOS.org
//

import { Layer } from 'effect';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { Blueprint } from '@dxos/blueprints';
import { Sequence } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';

import { AppGraphBuilder, IntentResolver, ReactSurface, Settings } from './capabilities';
import { AssistantCapabilities } from './capability-definitions';
import { meta } from './meta';
import { translations } from './translations';
import { Assistant, ServiceType } from './types';

export const AssistantPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.SetupSettings,
      activate: Settings,
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
      activate: () => [
        contributes(Capabilities.Metadata, {
          id: Type.getTypename(Assistant.Chat),
          metadata: {
            icon: 'ph--atom--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: Type.getTypename(Blueprint.Blueprint),
          metadata: {
            icon: 'ph--blueprint--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: Type.getTypename(Sequence),
          metadata: {
            icon: 'ph--circuitry--regular',
          },
        }),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/object-form`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => [
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: Assistant.Chat,
            getIntent: (_, options) => createIntent(Assistant.CreateChat, { space: options.space }),
          }),
        ),
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: Blueprint.Blueprint,
            formSchema: Assistant.BlueprintForm,
            getIntent: (props) => createIntent(Assistant.CreateBlueprint, props),
          }),
        ),
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: Sequence,
            getIntent: () => createIntent(Assistant.CreateSequence),
          }),
        ),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => contributes(ClientCapabilities.Schema, [ServiceType, Assistant.CompanionTo]),
    }),
    defineModule({
      id: `${meta.id}/module/on-space-created`,
      activatesOn: SpaceEvents.SpaceCreated,
      activate: () =>
        contributes(SpaceCapabilities.OnSpaceCreated, ({ space, rootCollection }) =>
          createIntent(Assistant.OnSpaceCreated, { space, rootCollection }),
        ),
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      // TODO(wittjosiah): Should occur before the chat is loaded when surfaces activation is more granular.
      activatesBefore: [Events.SetupArtifactDefinition],
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/ai-service`,
      activatesOn: Events.Startup,
      activate: () => [
        // TODO(dmaretskyi): Read config from settings.
        contributes(AssistantCapabilities.AiServiceLayer, AiServiceTestingPreset('edge-remote').pipe(Layer.orDie)),
      ],
    }),
  ]);
