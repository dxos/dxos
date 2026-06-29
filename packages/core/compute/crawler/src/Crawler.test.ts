//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { SemanticStore } from '@dxos/semantic-index';

import { AgentRegistry } from './AgentRegistry';
import { run } from './Crawler';
import { CrawlError } from './errors';
import { Source } from './Source';
import { type Stage } from './Stage';
import { makeAgentProfileStage } from './stages/agent-profile';
import { makeExtractFactsStage } from './stages/extract-facts';
import { extractTopics } from './stages/topics';
import { StateStore } from './StateStore';
import { TestLayer, THREADED_FIXTURE, servicesLayer } from './testing';
import type * as Type from './types';

const CONFIG: Type.Config = { channels: ['chan-1'], descendThreads: true };

const STAGES: Stage[] = [makeAgentProfileStage(), makeExtractFactsStage()];

/** A source whose fetch fails with a typed error — exercises per-target failure isolation. */
const FAILING_SOURCE = Layer.succeed(Source, {
  listChannels: () => Effect.succeed([{ id: 'chan-1' }]),
  fetchMessages: () => Effect.fail(new CrawlError({ message: 'Missing Access' })),
});

/** A source whose fetch DIES (defect) — exercises defect isolation (dfx can surface a 403 this way). */
const DYING_SOURCE = Layer.succeed(Source, {
  listChannels: () => Effect.succeed([{ id: 'chan-1' }]),
  fetchMessages: () => Effect.die(new Error('Missing Access')),
});

/** A stage that records the event sequence, to assert traversal order. */
const recorder = (log: string[]): Stage => ({
  name: 'recorder',
  handles: ['ChannelStart', 'Message', 'ThreadStart', 'ThreadEnd', 'ChannelEnd'],
  apply: (event) =>
    Effect.sync(() => {
      log.push(event._tag === 'Message' ? `Message:${event.message.id}` : event._tag);
    }),
});

describe('Crawler', () => {
  it.effect(
    'crawls depth-first, builds the fact graph, tracks agents, and surfaces topics',
    Effect.fnUntraced(
      function* () {
        const summary = yield* run(CONFIG, STAGES);
        const store = yield* SemanticStore;
        const registry = yield* AgentRegistry;
        const state = yield* StateStore;

        const agents = yield* registry.list();
        const facts = yield* store.query({});
        const report = yield* extractTopics();
        const targets = yield* state.listTargets();

        expect(summary.done).toBe(true);
        // Both the channel and its thread were fully drained.
        expect(targets.map((target) => target.id).sort()).toEqual(['chan-1', 'thread-1']);
        expect(targets.every((target) => target.status === 'done')).toBe(true);

        // Four messages across three authors; Alice posted in both the channel and the thread.
        expect(agents.length).toBe(3);
        const alice = agents.find((agent) => agent.label === 'Alice');
        expect(alice?.messageCount).toBe(2);
        expect(alice?.id).toBe('discord-user:Alice');

        // The fact graph is populated and topics are ranked by reach (distinct agents).
        expect(facts.length).toBeGreaterThan(0);
        expect(report.topics.length).toBeGreaterThan(0);
        expect(report.topics[0].entity).toBe('opfs');
        expect(report.topics[0].agents).toBe(2);
      },
      Effect.provide(TestLayer(THREADED_FIXTURE)),
    ),
  );

  it.effect(
    'descends into the thread between channel start and end (depth-first)',
    Effect.fnUntraced(
      function* () {
        const log: string[] = [];
        yield* run(CONFIG, [recorder(log)]);
        const channelStart = log.indexOf('ChannelStart');
        const threadStart = log.indexOf('ThreadStart');
        const threadEnd = log.indexOf('ThreadEnd');
        const channelEnd = log.indexOf('ChannelEnd');

        expect(channelStart).toBe(0);
        // Thread is opened and closed before the channel closes.
        expect(channelStart).toBeLessThan(threadStart);
        expect(threadStart).toBeLessThan(threadEnd);
        expect(threadEnd).toBeLessThan(channelEnd);
        // Thread messages sit inside the thread span.
        expect(log.indexOf('Message:2000')).toBeGreaterThan(threadStart);
        expect(log.indexOf('Message:2000')).toBeLessThan(threadEnd);
      },
      Effect.provide(TestLayer(THREADED_FIXTURE)),
    ),
  );

  it.effect(
    'resumes from the persisted frontier after a bounded stop',
    Effect.fnUntraced(
      function* () {
        // Stop after a single step (channel page read, thread not yet drained).
        const first = yield* run(CONFIG, STAGES, { maxSteps: 1 });
        expect(first.done).toBe(false);

        // Resume over the same state stores until complete.
        const second = yield* run(CONFIG, STAGES);
        expect(second.done).toBe(true);

        const registry = yield* AgentRegistry;
        const agents = yield* registry.list();
        const alice = agents.find((agent) => agent.label === 'Alice');
        // No message was processed twice across the stop/resume boundary.
        expect(alice?.messageCount).toBe(2);
        expect(agents.reduce((total, agent) => total + agent.messageCount, 0)).toBe(4);
      },
      Effect.provide(TestLayer(THREADED_FIXTURE)),
    ),
  );

  it.effect(
    'isolates a source-fetch failure to the target and finishes cleanly',
    Effect.fnUntraced(
      function* () {
        const summary = yield* run({ channels: ['chan-1'], descendThreads: false }, STAGES);
        const state = yield* StateStore;
        const targets = yield* state.listTargets();

        // The run completes rather than crashing; the bad target is marked errored.
        expect(summary.done).toBe(true);
        expect(summary.errored).toBe(1);
        expect(targets[0].status).toBe('error');
        expect(targets[0].lastError).toContain('Missing Access');
      },
      Effect.provide(Layer.merge(FAILING_SOURCE, servicesLayer)),
    ),
  );

  it.effect(
    'isolates a source-fetch defect (die) to the target too',
    Effect.fnUntraced(
      function* () {
        const summary = yield* run({ channels: ['chan-1'], descendThreads: false }, STAGES);
        const state = yield* StateStore;
        const targets = yield* state.listTargets();

        expect(summary.done).toBe(true);
        expect(summary.errored).toBe(1);
        expect(targets[0].status).toBe('error');
      },
      Effect.provide(Layer.merge(DYING_SOURCE, servicesLayer)),
    ),
  );

  it.effect(
    're-running a completed crawl reprocesses nothing (idempotent)',
    Effect.fnUntraced(
      function* () {
        yield* run(CONFIG, STAGES);
        const store = yield* SemanticStore;
        const before = (yield* store.query({})).length;

        yield* run(CONFIG, STAGES);
        const after = (yield* store.query({})).length;
        const registry = yield* AgentRegistry;
        const agents = yield* registry.list();

        expect(after).toBe(before);
        expect(agents.reduce((total, agent) => total + agent.messageCount, 0)).toBe(4);
      },
      Effect.provide(TestLayer(THREADED_FIXTURE)),
    ),
  );
});
