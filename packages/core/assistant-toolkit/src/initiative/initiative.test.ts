//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { ConsolePrinter } from '@dxos/ai';
import { MemoizedAiService } from '@dxos/ai/testing';
import { AiConversation, GenerationObserver, type ContextBinding } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Database, Obj, Ref } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { QueueService } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { type Message } from '@dxos/types';
import * as Initiative from './Initiative';
import { getContext } from './functions';
ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  functions: [getContext],
  types: [Initiative.Initiative],
});

describe('Initiative', () => {
  it.scoped(
    'shopping list',
    Effect.fnUntraced(
      function* (_) {
        const observer = GenerationObserver.fromPrinter(new ConsolePrinter());
        const initiativeBlueprint = yield* Database.Service.add(Obj.clone(Initiative.InitiativeBlueprint));
        const initiative = yield* Database.Service.add(
          Initiative.make({
            name: 'Keep a shopping list.',
            spec: 'Keep a shopping list of items to buy as an artifact',
          }),
        );
        yield* Database.Service.flush({ indexes: true });
        const queue = yield* QueueService.createQueue<Message.Message | ContextBinding>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation({ queue }));
        yield* Effect.promise(() =>
          conversation.context.bind({
            blueprints: [Ref.make(initiativeBlueprint)],
            objects: [Ref.make(initiative)],
          }),
        );

        yield* conversation.createRequest({
          prompt: `List ingredients for a scrambled eggs on a toast breakfast.`,
          observer,
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});
