//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { GenericToolkit } from '@dxos/ai';
import { AiConversationService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';

import MemoryBlueprint from './blueprint';
import { MemoryHandlers } from './functions';
import { Memory } from '../../types/Memory';
import { WebSearchBlueprint, WebSearchToolkit } from '../websearch';
import { addBlueprints } from '../testing';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: MemoryHandlers,
  types: [Memory, Blueprint.Blueprint],
  tracing: 'pretty',
});

const TestLayerWithWebSearch = AssistantTestLayer({
  operationHandlers: MemoryHandlers,
  toolkits: [GenericToolkit.make(WebSearchToolkit, Layer.empty)],
  types: [Memory, Blueprint.Blueprint],
  tracing: 'pretty',
});

describe('Memory Blueprint', () => {
  it.effect(
    'save: saves a memory',
    Effect.fnUntraced(
      function* (_) {
        yield* addBlueprints([MemoryBlueprint]);
        yield* AiConversationService.run({
          prompt: 'Remember that my favorite programming language is TypeScript.',
        });
        yield* Database.flush();
        const memories = yield* Database.runQuery(Query.select(Filter.type(Memory)));
        expect(memories.length).toBeGreaterThanOrEqual(1);
      },
      Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer))),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'query: searches memories by text',
    Effect.fnUntraced(
      function* (_) {
        yield* addBlueprints([MemoryBlueprint]);
        yield* Database.add(
          Obj.make(Memory, {
            title: 'Favorite color',
            content: 'The user prefers blue.',
          }),
        );
        yield* Database.add(
          Obj.make(Memory, {
            title: 'Meeting notes',
            content: 'Discussed project timeline with Alice.',
          }),
        );
        const messages = yield* AiConversationService.run({
          prompt: 'Search your memories for anything about colors.',
        });
        const lastMessage = messages.at(-1);
        expect(lastMessage).toBeDefined();
      },
      Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer))),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'delete: removes a memory',
    Effect.fnUntraced(
      function* (_) {
        yield* addBlueprints([MemoryBlueprint]);
        yield* Database.add(
          Obj.make(Memory, {
            title: 'Outdated fact',
            content: 'The sky is green.',
          }),
        );
        yield* AiConversationService.run({
          prompt: 'Delete the memory about "Outdated fact".',
        });
        yield* Database.flush();
        const memories = yield* Database.runQuery(Query.select(Filter.type(Memory)));
        const found = memories.find((memory) => memory.title === 'Outdated fact');
        expect(found).toBeUndefined();
      },
      Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer))),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'natural: saves memories from a conversation with web search',
    Effect.fnUntraced(
      function* (_) {
        yield* addBlueprints([MemoryBlueprint, WebSearchBlueprint]);
        yield* AiConversationService.run({
          prompt: "I'm going to LA next week. Find me some good hotels and remember the recommendations.",
        });
        yield* Database.flush();
        const memories = yield* Database.runQuery(Query.select(Filter.type(Memory)));
        expect(memories.length).toBeGreaterThanOrEqual(1);
        const hasLAMemory = memories.some(
          (memory) =>
            memory.title.toLowerCase().includes('la') ||
            memory.title.toLowerCase().includes('los angeles') ||
            memory.content.toLowerCase().includes('hotel'),
        );
        expect(hasLAMemory).toBe(true);
      },
      Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayerWithWebSearch))),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );
});
