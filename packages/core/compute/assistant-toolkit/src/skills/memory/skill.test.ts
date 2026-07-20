//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer, operationToolCall } from '@dxos/agent-runtime/testing';
import { OpaqueToolkit } from '@dxos/ai';
import { ScriptedAiService } from '@dxos/ai/testing';
import { Skill } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { Memory } from '../../types/Memory';
import { WebSearchToolkit } from '../websearch';
import { MemoryHandlers, MemoryOperations } from './operations';
import MemorySkill from './skill';

// The agent's tool-calling behaviour is scripted inline per test via a mock model (no recorded
// conversation to regenerate). Non-ref tool inputs are type-checked against each operation's input
// schema through `operationToolCall`; the ref-bearing `delete-memory` input is scripted with a raw
// tool call whose top-level ref parameter resolves lazily from a mutable holder the test fills
// before submitting the prompt.
const testLayer = (script: ScriptedAiService.Script) =>
  AssistantTestLayer({
    operationHandlers: MemoryHandlers,
    types: [Memory, Skill.Skill, Feed.Feed],
    skills: [MemorySkill.make()],
    tracing: 'pretty',
    aiService: ScriptedAiService.layer(script),
  });

const testLayerWithWebSearch = (script: ScriptedAiService.Script) =>
  AssistantTestLayer({
    operationHandlers: MemoryHandlers,
    toolkits: [OpaqueToolkit.make(WebSearchToolkit, Layer.empty)],
    types: [Memory, Skill.Skill, Feed.Feed],
    skills: [MemorySkill.make()],
    tracing: 'pretty',
    aiService: ScriptedAiService.layer(script),
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
      Effect.provide(
        testLayer([
          operationToolCall(MemoryOperations.SaveMemory, {
            title: 'Favorite Programming Language',
            content: "The user's favorite programming language is TypeScript.",
          }),
          ScriptedAiService.text("Got it! I've saved that your favorite programming language is TypeScript."),
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
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
      Effect.provide(
        testLayer([
          operationToolCall(MemoryOperations.QueryMemories, { text: 'colors' }),
          ScriptedAiService.text('I searched my memories for anything about colors.'),
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'delete: removes a memory',
    (() => {
      const ref: { memory?: string } = {};
      return Effect.fnUntraced(
        function* (_) {
          const memory = yield* Database.add(
            Obj.make(Memory, {
              title: 'Outdated fact',
              content: 'The sky is green.',
            }),
          );
          // A top-level ref parameter (`delete-memory`'s `memory`) is a bare URI string.
          ref.memory = Obj.getURI(memory);
          const agent = yield* AgentService.createSession({
            skills: [MemorySkill.make()],
          });
          yield* agent.submitPrompt('Delete the memory about "Outdated fact".');
          yield* agent.waitForCompletion();
          const memories = yield* Database.query(Query.select(Filter.type(Memory))).run;
          const found = memories.find((entry) => entry.title === 'Outdated fact');
          expect(found).toBeUndefined();
        },
        Effect.provide(
          testLayer([
            operationToolCall(MemoryOperations.QueryMemories, { text: 'Outdated fact' }),
            ScriptedAiService.toolCall('delete-memory', () => ({ memory: ref.memory })),
            ScriptedAiService.text('I\'ve deleted the memory titled "Outdated fact".'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
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
      Effect.provide(testLayerWithWebSearch([])),
      TestHelpers.provideTestContext,
    ),
  );
});
