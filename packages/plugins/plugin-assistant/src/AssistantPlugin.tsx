//
// Copyright 2023 DXOS.org
//

import { Effect, Layer } from 'effect';

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { Blueprint } from '@dxos/blueprints';
import { Sequence } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';
import { AnthropicClient } from '@effect/ai-anthropic';

import { AiServiceRouter } from '@dxos/ai';
import { FetchHttpClient } from '@effect/platform';
import { AppGraphBuilder, BlueprintDefinition, IntentResolver, ReactSurface, Settings } from './capabilities';
import { AssistantCapabilities, AssistantActivationEvents } from './defs';
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
        contributes(SpaceCapabilities.OnSpaceCreated, ({ rootCollection, space }) =>
          createIntent(Assistant.OnSpaceCreated, { rootCollection, space }),
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
      id: `${meta.id}/module/s`,
      activatesOn: Events.Startup,
      activatesAfter: [AssistantActivationEvents.AiServiceProvidersReady],
      activate: () => {
        return [
          contributes(
            AssistantCapabilities.AiModelResolver,
            AiServiceRouter.AnthropicResolver.pipe(
              Layer.provide(
                AnthropicClient.layer({
                  // TODO(dmaretskyi): Read endpoint from config/settings.
                  apiUrl: 'https://ai-service.dxos.workers.dev/provider/anthropic',
                }),
              ),
              Layer.provide(FetchHttpClient.layer),
            ),
          ),
        ];
      },
    }),
    defineModule({
      id: `${meta.id}/module/ai-service`,
      // Must activate after the `AssistantCapabilities.AiModelResolver` were contributed.
      activatesOn: AssistantActivationEvents.AiServiceProvidersReady,
      activate: (context) => {
        const aiModelResolvers = context.getCapabilities(AssistantCapabilities.AiModelResolver);
        console.log('aiModelResolvers', aiModelResolvers);

        // TODO(dmaretskyi): Extract function to read them.
        const combinedLayer = aiModelResolvers.reduce(
          (acc, resolver) => resolver.pipe(Layer.provide(acc)),
          AiServiceRouter.AiModelResolver.fromModelMap(Effect.succeed({})), // Empty resolver as fallback.
        );

        return [
          // TODO(dmaretskyi): Read config from settings.
          contributes(
            AssistantCapabilities.AiServiceLayer,
            AiServiceRouter.AiModelResolver.buildAiService.pipe(Layer.provide(combinedLayer)),
          ),
        ];
      },
    }),
    defineModule({
      id: `${meta.id}/module/blueprint`,
      activatesOn: Events.SetupArtifactDefinition,
      activate: BlueprintDefinition,
    }),
  ]);
