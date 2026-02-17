//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService, ConsolePrinter } from '@dxos/ai';
import { MemoizedAiService, TestAiService } from '@dxos/ai/testing';
import {
  AiContextService,
  AiConversation,
  AiConversationService,
  type ContextBinding,
  GenerationObserver,
  GenericToolkit,
} from '@dxos/assistant';
import { waitForCondition } from '@dxos/async';
import { Blueprint, Template } from '@dxos/blueprints';
import { Database, Obj, Ref } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { CredentialsService, QueueService, TracingService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTest, TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { ObjectId } from '@dxos/keys';
import { Message, Organization, Person } from '@dxos/types';
import { AssistantTestLayer } from '@dxos/assistant/testing';

import * as AssistantToolkit from './AssistantToolkit';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  types: [Blueprint.Blueprint, Message.Message, Person.Person, Organization.Organization],
  toolkits: [GenericToolkit.make(AssistantToolkit.AssistantToolkit, AssistantToolkit.layer())],
  tracing: 'pretty',
});

const blueprint = Blueprint.make({
  key: 'dxos.org/blueprint/assistant',
  name: 'Assistant',
  tools: Blueprint.toolDefinitions({ tools: AssistantToolkit.tools }),
  instructions: Template.make(),
});

describe('AssistantToolkit', () => {
  it.scoped(
    'can add to context',
    Effect.fnUntraced(
      function* (_) {
        yield* AiContextService.bindContext({
          blueprints: [Ref.make(yield* Database.add(blueprint))],
        });

        const organization = yield* Database.add(
          Obj.make(Organization.Organization, {
            name: 'Cyberdyne Systems',
            website: 'https://cyberdyne.com',
          }),
        );

        yield* AiConversationService.run({
          prompt: `Add to context: ${JSON.stringify(organization)}`,
        });

        const { binder } = yield* AiContextService;
        yield* Effect.promise(() =>
          waitForCondition({
            condition: () => binder.getBlueprints().length > 0 && binder.getObjects().length > 0,
            timeout: 10_000,
          }),
        );

        expect(binder.getBlueprints()).toEqual([blueprint]);
        expect(binder.getObjects()).toEqual([organization]);
      },
      Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer))),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined,
  );
});
