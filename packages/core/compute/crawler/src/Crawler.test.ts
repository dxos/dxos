//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { expect } from 'vitest';

import { Pipeline } from '@dxos/pipeline';
import { FactStore } from '@dxos/pipeline-rdf';

import { AgentRegistry } from './AgentRegistry';
import * as Crawler from './Crawler';
import { CrawlError, StageError } from './errors';
import { Source } from './Source';
import { tapStage } from './Stage';
import { agentProfileStage } from './stages/agent-profile';
import { extractFactsStage } from './stages/extract-facts';
import { extractTopics } from './stages/topics';
import { StateStore } from './StateStore';
import { TestLayer, THREADED_FIXTURE, servicesLayer } from './testing';
import type * as Type from './types';

const CONFIG: Type.Config = { channels: ['chan-1'], descendThreads: true };

const ALL_TAGS: Type.EventTag[] = ['ChannelStart', 'Message', 'ThreadStart', 'ThreadEnd', 'ChannelEnd'];

/** Default assembly used by these tests: profile + extraction, committed via the sink. */
const runCrawl = (config: Type.Config, options?: Crawler.StreamOptions) =>
  Effect.gen(function* () {
    yield* Crawler.stream(config, options).pipe(
      agentProfileStage(),
      extractFactsStage(),
      Pipeline.run({ sink: Crawler.commit }),
    );
    return yield* Crawler.summarize();
  });

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

describe('Crawler', () => {
  it.effect(
    'crawls depth-first, builds the fact graph, tracks agents, and surfaces topics',
    Effect.fnUntraced(
      function* () {
        const summary = yield* runCrawl(CONFIG);
        const store = yield* FactStore;
        const registry = yield* AgentRegistry;
        const state = yield* StateStore;

        const agents = yield* registry.list();
        const facts = yield* store.query({});
        const report = yield* extractTopics();
        const targets = yield* state.listTargets();

        expect(summary.done).toBe(true);
        expect(targets.map((target) => target.id).sort()).toEqual(['chan-1', 'thread-1']);
        expect(targets.every((target) => target.status === 'done')).toBe(true);
        // Commit-after-process: the durable cursor is the last processed message id per target.
        expect(targets.find((target) => target.id === 'chan-1')?.cursor).toBe('1001');
        expect(targets.find((target) => target.id === 'thread-1')?.cursor).toBe('2001');

        expect(agents.length).toBe(3);
        const alice = agents.find((agent) => agent.label === 'Alice');
        expect(alice?.messageCount).toBe(2);
        expect(alice?.id).toBe('discord-user:Alice');

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
        const recorder = tapStage('recorder', ALL_TAGS, (event) =>
          Effect.sync(() => {
            log.push(event._tag === 'Message' ? `Message:${event.message.id}` : event._tag);
          }),
        );
        yield* Crawler.stream(CONFIG).pipe(recorder, Pipeline.run({ sink: Crawler.commit }));

        const channelStart = log.indexOf('ChannelStart');
        const threadStart = log.indexOf('ThreadStart');
        const threadEnd = log.indexOf('ThreadEnd');
        const channelEnd = log.indexOf('ChannelEnd');
        expect(channelStart).toBe(0);
        expect(channelStart).toBeLessThan(threadStart);
        expect(threadStart).toBeLessThan(threadEnd);
        expect(threadEnd).toBeLessThan(channelEnd);
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
        const first = yield* runCrawl(CONFIG, { maxSteps: 1 });
        expect(first.done).toBe(false);

        const second = yield* runCrawl(CONFIG);
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
    'advances the durable cursor only when events clear the sink',
    Effect.fnUntraced(
      function* () {
        // Drain two events (ChannelStart + first Message) WITHOUT the commit sink.
        yield* Crawler.stream(CONFIG).pipe(Stream.take(2), Stream.runDrain);
        const state = yield* StateStore;
        const before = yield* state.listTargets();
        // The fetch happened, but nothing was committed: no durable cursor movement.
        expect(before.find((target) => target.id === 'chan-1')?.cursor).toBeUndefined();

        // A full run over the same store refetches from scratch and counts each message once.
        const summary = yield* runCrawl(CONFIG);
        expect(summary.done).toBe(true);
        const registry = yield* AgentRegistry;
        const agents = yield* registry.list();
        expect(agents.reduce((total, agent) => total + agent.messageCount, 0)).toBe(4);
      },
      Effect.provide(TestLayer(THREADED_FIXTURE)),
    ),
  );

  it.effect(
    'isolates a source-fetch failure to the target and finishes cleanly',
    Effect.fnUntraced(
      function* () {
        const summary = yield* runCrawl({ channels: ['chan-1'], descendThreads: false });
        const state = yield* StateStore;
        const targets = yield* state.listTargets();
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
        const summary = yield* runCrawl({ channels: ['chan-1'], descendThreads: false });
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
    'isolates a stage failure to the target (recorded, crawl continues)',
    Effect.fnUntraced(
      function* () {
        const boom = tapStage('boom', ['Message'], (event) =>
          event._tag === 'Message' && event.message.id === '1000'
            ? Effect.fail(new StageError({ message: 'kaput' }))
            : Effect.void,
        );
        yield* Crawler.stream(CONFIG).pipe(boom, agentProfileStage(), Pipeline.run({ sink: Crawler.commit }));
        const summary = yield* Crawler.summarize();
        const state = yield* StateStore;
        const targets = yield* state.listTargets();

        expect(summary.done).toBe(true);
        expect(targets.find((target) => target.id === 'chan-1')?.lastError).toContain('boom: kaput');
        // Later messages still flowed through the stage that follows the failing one.
        const registry = yield* AgentRegistry;
        const agents = yield* registry.list();
        expect(agents.reduce((total, agent) => total + agent.messageCount, 0)).toBe(4);
      },
      Effect.provide(TestLayer(THREADED_FIXTURE)),
    ),
  );

  it.effect(
    're-running a completed crawl reprocesses nothing (idempotent)',
    Effect.fnUntraced(
      function* () {
        yield* runCrawl(CONFIG);
        const store = yield* FactStore;
        const before = (yield* store.query({})).length;

        yield* runCrawl(CONFIG);
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
