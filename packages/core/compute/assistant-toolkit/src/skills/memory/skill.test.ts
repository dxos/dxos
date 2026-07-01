//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { OpaqueToolkit } from '@dxos/ai';
import { Skill } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AgentService } from '@dxos/functions-runtime';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';

import { Memory } from '../../types/Memory';
import { WebSearchToolkit } from '../websearch';
import { MemoryHandlers } from './operations';
import MemorySkill from './skill';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: MemoryHandlers,
  types: [Memory, Skill.Skill, Feed.Feed],
  skills: [MemorySkill.make()],
  tracing: 'pretty',
});

const TestLayerWithWebSearch = AssistantTestLayer({
  operationHandlers: MemoryHandlers,
  toolkits: [OpaqueToolkit.make(WebSearchToolkit, Layer.empty)],
  types: [Memory, Skill.Skill, Feed.Feed],
  skills: [MemorySkill.make()],
  tracing: 'pretty',
});

describe('Memory Skill', () => {
  it.effect(
    'save: saves a memory',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [MemorySkill.make()],
        });
        yield* agent.submitPrompt('Remember that my favorite programming language is TypeScript.');
        yield* agent.waitForCompletion();
        const memories = yield* Database.query(Query.select(Filter.type(Memory))).run;
        expect(memories.length).toBeGreaterThanOrEqual(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'query: searches memories by text',
    Effect.fnUntraced(
      function* (_) {
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
        const agent = yield* AgentService.createSession({
          skills: [MemorySkill.make()],
        });
        yield* agent.submitPrompt('Search your memories for anything about colors.');
        yield* agent.waitForCompletion();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'delete: removes a memory',
    Effect.fnUntraced(
      function* (_) {
        yield* Database.add(
          Obj.make(Memory, {
            title: 'Outdated fact',
            content: 'The sky is green.',
          }),
        );
        const agent = yield* AgentService.createSession({
          skills: [MemorySkill.make()],
        });
        yield* agent.submitPrompt('Delete the memory about "Outdated fact".');
        yield* agent.waitForCompletion();
        const memories = yield* Database.query(Query.select(Filter.type(Memory))).run;
        const found = memories.find((memory) => memory.title === 'Outdated fact');
        expect(found).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  // TODO(dmaretskyi): Flaky. The model does not reliably call save-memory after a provider-executed web search.
  it.effect.skip(
    'natural: saves memories from a conversation with web search',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [MemorySkill.make()],
        });
        yield* agent.submitPrompt(
          "I'm going to LA next week. Find me some good hotels and remember the recommendations.",
        );
        yield* agent.waitForCompletion();
        const memories = yield* Database.query(Query.select(Filter.type(Memory))).run;
        expect(memories.length).toBeGreaterThanOrEqual(1);
        const hasLAMemory = memories.some(
          (memory) =>
            memory.title.toLowerCase().includes('la') ||
            memory.title.toLowerCase().includes('los angeles') ||
            memory.content.toLowerCase().includes('hotel'),
        );
        expect(hasLAMemory).toBe(true);
      },
      Effect.provide(TestLayerWithWebSearch),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );
});
