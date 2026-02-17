//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService, ConsolePrinter } from '@dxos/ai';
import { MemoizedAiService, TestAiService } from '@dxos/ai/testing';
import { AiConversation, type ContextBinding, GenerationObserver, GenericToolkit } from '@dxos/assistant';
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
        const { db } = yield* Database.Service;
        const queue = yield* QueueService.createQueue<Message.Message | ContextBinding>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation({ queue }));
        const observer = GenerationObserver.fromPrinter(new ConsolePrinter());

        yield* Effect.promise(() =>
          conversation.context.bind({
            blueprints: [Ref.make(db.add(blueprint))],
          }),
        );

        const organization = yield* Database.add(
          Obj.make(Organization.Organization, {
            name: 'Cyberdyne Systems',
            website: 'https://cyberdyne.com',
          }),
        );

        yield* conversation.createRequest({
          prompt: `Add to context: ${JSON.stringify(organization)}`,
          observer,
        });

        yield* Effect.promise(() =>
          waitForCondition({
            condition: () =>
              conversation.context.getBlueprints().length > 0 && conversation.context.getObjects().length > 0,
          }),
        );

        expect(conversation.context.getBlueprints()).toEqual([blueprint]);
        expect(conversation.context.getObjects()).toEqual([organization]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined,
  );
});
