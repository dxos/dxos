//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { AgentRegistry, StateStore, type Type } from '@dxos/crawler';
import { FactStore } from '@dxos/pipeline-rdf';

import { DiscordPipeline } from './pipeline';
import { MessageStore, QuestionStore } from './stores';
import { THREADED_FIXTURE, deterministicAiService, fixtureSourceLayer, storesLayer } from './testing';

const CONFIG: Type.Config = { channels: ['chan-1'], descendThreads: true };

const TestLayer = Layer.mergeAll(
  storesLayer(SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie)),
  fixtureSourceLayer(THREADED_FIXTURE),
  deterministicAiService(),
);

describe('DiscordPipeline', () => {
  it.effect(
    'crawls, persists messages, tracks agents, extracts facts, and reports done',
    Effect.fnUntraced(function* () {
      const summary = yield* DiscordPipeline.run(CONFIG);
      expect(summary.done).toBe(true);
      expect(summary.errored).toBe(0);
      expect(summary.steps).toBeGreaterThan(0);

      const messages = yield* MessageStore;
      expect(yield* messages.count()).toBe(4);
      const channelMessages = yield* messages.listByTarget('chan-1');
      expect(channelMessages.map((message) => message.id)).toEqual(['1000', '1001']);

      const registry = yield* AgentRegistry;
      const agents = yield* registry.list();
      expect(agents.length).toBe(3);

      const facts = yield* (yield* FactStore).query({});
      expect(facts.length).toBeGreaterThan(0);

      const state = yield* StateStore;
      expect(yield* state.getRunStatus()).toBe('done');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'pauses at maxSteps and resumes exactly-once over the same stores',
    Effect.fnUntraced(function* () {
      const first = yield* DiscordPipeline.run(CONFIG, { maxSteps: 1 });
      expect(first.done).toBe(false);
      const state = yield* StateStore;
      expect(yield* state.getRunStatus()).toBe('paused');

      const second = yield* DiscordPipeline.run(CONFIG);
      expect(second.done).toBe(true);

      const registry = yield* AgentRegistry;
      const agents = yield* registry.list();
      expect(agents.reduce((total, agent) => total + agent.messageCount, 0)).toBe(4);
      expect(yield* (yield* MessageStore).count()).toBe(4);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'replayed messages are dropped by the persist stage (exactly-once downstream)',
    Effect.fnUntraced(function* () {
      yield* DiscordPipeline.run(CONFIG);
      const factsBefore = (yield* (yield* FactStore).query({})).length;
      const state = yield* StateStore;
      // Simulate a resume-overlap: reopen the channel with a rolled-back durable cursor.
      yield* state.setStatus('chan-1', 'active');
      yield* state.setCursor('chan-1', '0');

      const summary = yield* DiscordPipeline.run(CONFIG);
      expect(summary.done).toBe(true);

      // Refetched messages were dropped before agent stats: counts unchanged.
      const registry = yield* AgentRegistry;
      const agents = yield* registry.list();
      expect(agents.reduce((total, agent) => total + agent.messageCount, 0)).toBe(4);
      expect(yield* (yield* MessageStore).count()).toBe(4);
      // Fact count also unchanged (nothing re-extracted).
      const factsAfter = (yield* (yield* FactStore).query({})).length;
      expect(factsAfter).toBe(factsBefore);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'attempts open questions at target end (deterministic model declines, question stays open)',
    Effect.fnUntraced(function* () {
      const questions = yield* QuestionStore;
      yield* questions.add('Who works on OPFS?', 'q-1');
      yield* DiscordPipeline.run(CONFIG);
      // The deterministic extractor never emits an `answer` field, so the question remains
      // open — the answered path is covered by answer-questions.test.ts with a routing fake.
      expect((yield* questions.get('q-1'))?.status).toBe('open');
    }, Effect.provide(TestLayer)),
  );
});
