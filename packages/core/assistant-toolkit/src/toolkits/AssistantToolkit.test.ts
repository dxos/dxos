//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService, MemoizedAiService, ConsolePrinter } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import {
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
  GenerationObserver,
  AiConversation,
  ContextBinding,
} from '@dxos/assistant';
import { Blueprint, Template } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { TestHelpers, acquireReleaseResource } from '@dxos/effect';
import {
  ComputeEventLogger,
  CredentialsService,
  DatabaseService,
  FunctionInvocationService,
  TracingService,
  QueueService,
} from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { ObjectId } from '@dxos/keys';
import { DataType } from '@dxos/schema';
import * as AssistantToolkit from './AssistantToolkit';
import { Ref } from '@dxos/echo';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([], AssistantToolkit.AssistantToolkit),
  makeToolExecutionServiceFromFunctions(AssistantToolkit.AssistantToolkit, AssistantToolkit.layer()),
  ComputeEventLogger.layerFromTracing,
).pipe(
  Layer.provideMerge(FunctionInvocationService.layerTest({})),
  Layer.provideMerge(
    Layer.mergeAll(
      MemoizedAiService.layerTest().pipe(Layer.provide(AiServiceTestingPreset('direct'))),
      TestDatabaseLayer({
        spaceKey: 'fixed',
        indexing: { vector: true },
        types: [Blueprint.Blueprint, DataType.Message, DataType.Person, DataType.Organization],
      }),
      CredentialsService.configuredLayer([]),
      TracingService.layerNoop,
    ),
  ),
);

const blueprint = Blueprint.make({
  key: 'dxos.org/blueprint/assistant',
  name: 'Assistant',
  tools: Blueprint.toolDefinitions({ tools: AssistantToolkit.tools }),
  instructions: Template.make({
    source: '',
  }),
});

describe('AssistantToolkit', () => {
  it.scoped(
    'can add to context',
    Effect.fnUntraced(
      function* (_) {
        const { db } = yield* DatabaseService;
        const queue = yield* QueueService.createQueue<DataType.Message | ContextBinding>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation(queue));
        const observer = GenerationObserver.fromPrinter(new ConsolePrinter());
        conversation.context.bind({ blueprints: [Ref.make(db.add(blueprint))] });

        const organization = yield* DatabaseService.add(
          Obj.make(DataType.Organization, {
            name: 'Cyberdyne Systems',
            website: 'https://cyberdyne.com',
          }),
        );

        yield* conversation.createRequest({
          prompt: `Add to context: ${JSON.stringify(organization)}`,
          observer,
        });

        expect(conversation.context.objects.value).toEqual([Ref.make(organization)]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined,
  );
});
