//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { expect } from 'vitest';

import { type AiService } from '@dxos/ai';
import { Pipeline } from '@dxos/pipeline';
import { FactStore, normalizeEntityId } from '@dxos/pipeline-rdf';
import { failingAiService } from '@dxos/pipeline-rdf/testing';

import * as Crawler from '../Crawler.ts';
import * as StateStore from '../StateStore.ts';
import { THREADED_FIXTURE, coreLayer, deterministicAiService, fixtureSourceLayer } from '../testing/index.ts';
import type * as Type from '../types.ts';
import { agentProfileStage } from './agent-profile.ts';
import { extractFactsStage } from './extract-facts.ts';

const CONFIG: Type.Config = { channels: ['chan-1'], descendThreads: true };

const TEXTS: Record<string, { readonly author: string; readonly text: string }> = {
  '1000': { author: 'Alice', text: 'Should Composer use OPFS for local storage?' },
  '1001': { author: 'Bob', text: 'DXOS already supports replication across peers.' },
  '2000': { author: 'Carol', text: 'OPFS gives Composer durable browser storage.' },
  '2001': { author: 'Alice', text: 'Automerge compaction reduces OPFS growth.' },
};

const layer = (prompts: string[], ai: Layer.Layer<AiService.AiService> = deterministicAiService(prompts)) =>
  Layer.mergeAll(fixtureSourceLayer(THREADED_FIXTURE), coreLayer, ai);

const crawl = (options?: Parameters<typeof extractFactsStage>[0]) =>
  Crawler.stream(CONFIG).pipe(agentProfileStage(), extractFactsStage(options), Pipeline.run({ sink: Crawler.commit }));

/** A channel's events around the four messages, for driving the stage without a crawl. */
const messageEvents = (): Type.Event[] => {
  const target: Type.Target = { id: 'chan-1', channelId: 'chan-1', depth: 0, status: 'active' };
  return [
    { _tag: 'ChannelStart', target },
    ...Object.entries(TEXTS).map(([id, { author, text }]): Type.Event => ({
      _tag: 'Message',
      target,
      message: { id, text, author: { id: author, source: 'discord', displayName: author } },
    })),
    { _tag: 'ChannelEnd', target: { ...target, status: 'done' } },
  ];
};

describe('extractFactsStage', () => {
  it.effect('extracts a batch of messages in one model request, citing each message', () => {
    const prompts: string[] = [];
    return Effect.gen(function* () {
      yield* crawl();
      expect(prompts).toHaveLength(1);

      const facts = yield* (yield* FactStore).query({});
      expect(facts.length).toBeGreaterThan(0);
      const cited = new Set<string>();
      for (const fact of facts) {
        const id = fact.attribution.source.replace(/^discord:/, '');
        const message = TEXTS[id];
        cited.add(id);
        // The deterministic extractor's facts are `author mentions noun`, so each must land on the message naming it.
        expect(message.text).toContain(fact.assertion.object.kind === 'entity' ? fact.assertion.object.label : '');
        expect(fact.attribution.agent).toBe(normalizeEntityId(`discord-user:${message.author}`));
      }
      expect([...cited].sort()).toEqual(Object.keys(TEXTS).sort());

      // Cursors still advance per message after the batch.
      const targets = yield* StateStore.listTargets();
      expect(targets.find((target) => target.id === 'chan-1')?.cursor).toBe('1001');
      expect(targets.find((target) => target.id === 'thread-1')?.cursor).toBe('2001');
    }).pipe(Effect.provide(layer(prompts)));
  });

  it.effect('passes every event through unchanged and in order', () => {
    const prompts: string[] = [];
    return Effect.gen(function* () {
      const events = messageEvents();
      const out: Type.Event[] = [];
      yield* Stream.fromIterable(events).pipe(
        extractFactsStage({ batchSize: 2 }),
        Pipeline.run({ sink: (event) => Effect.sync(() => out.push(event)) }),
      );
      expect(out).toEqual(events);
      expect(prompts).toHaveLength(2);
    }).pipe(Effect.provide(layer(prompts)));
  });

  it.effect('a re-run sends nothing to the model', () => {
    const prompts: string[] = [];
    return Effect.gen(function* () {
      const run = Stream.fromIterable(messageEvents()).pipe(extractFactsStage(), Stream.runDrain);
      yield* run;
      const store = yield* FactStore;
      const before = (yield* store.query({})).length;
      yield* run;
      expect(prompts).toHaveLength(1);
      expect((yield* store.query({})).length).toBe(before);
    }).pipe(Effect.provide(layer(prompts)));
  });

  it.effect('batchSize 1 makes one single-document request per message', () => {
    const prompts: string[] = [];
    return Effect.gen(function* () {
      yield* crawl({ batchSize: 1 });
      expect(prompts).toHaveLength(Object.keys(TEXTS).length);
      expect(prompts.every((prompt) => !prompt.includes('<message'))).toBe(true);
    }).pipe(Effect.provide(layer(prompts)));
  });

  it.effect('records a failed batch on its targets and still commits its events', () => {
    return Effect.gen(function* () {
      yield* crawl();
      const summary = yield* Crawler.summarize();
      const targets = yield* StateStore.listTargets();
      expect(summary.done).toBe(true);
      expect(targets.find((target) => target.id === 'thread-1')?.lastError).toContain('extract-facts:');
      expect(targets.find((target) => target.id === 'chan-1')?.cursor).toBe('1001');
      expect(targets.find((target) => target.id === 'thread-1')?.cursor).toBe('2001');
    }).pipe(Effect.provide(layer([], failingAiService())));
  });
});
