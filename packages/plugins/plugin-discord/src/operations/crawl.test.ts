//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Trigger from '@dxos/compute/Trigger';
import { CrawlState } from '@dxos/crawler';
import { deterministicAiService } from '@dxos/crawler/testing';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { MemoryQuery, MemoryService } from '@dxos/echo-memory';
import * as MemorySqlite from '@dxos/echo-memory-sqlite/MemorySqlite';
import { Topic } from '@dxos/pipeline-discord';
import { Person } from '@dxos/types';

import { DiscordService } from '#types';

import { KAI_APPLICATION_IDS } from '../constants.ts';
import configureBackIndex from './configure-back-index.ts';
import crawl from './crawl.ts';

const CHANNEL = '900000000000000002';
const KAI = KAI_APPLICATION_IDS.local;

const message = (id: string, author: string, content: string): DiscordService.Message => ({
  id,
  type: 0,
  content,
  timestamp: '2026-09-01T10:00:00.000Z',
  author: { id: `7000${author.length}`, username: author.toLowerCase(), global_name: author },
  mentions: [],
});

const HISTORY = [
  message('1300000000000000001', 'Dima', 'Dima owns the Indexer service and rewrites its Migration runner.'),
  message('1300000000000000002', 'Josiah', 'Josiah reviews the Migration runner rewrite.'),
  message('1300000000000000003', 'Dima', 'The Indexer migration is scheduled for Friday.'),
];

type Read = { readonly bot: DiscordService.Bot; readonly request: DiscordService.FetchMessages };

/** A bot host serving `history`, newest first as Discord answers; records each read in `reads`. */
const fakeDiscord = (history: Map<string, DiscordService.Message[]>, reads: Read[] = []) =>
  Layer.succeed(DiscordService.DiscordService, {
    listChannels: () => Effect.succeed([]),
    fetchMessages: (bot, request) =>
      Effect.sync(() => {
        reads.push({ bot, request });
        return (history.get(request.channelId) ?? [])
          .filter(({ id }) => BigInt(id) > BigInt(request.after))
          .sort((left, right) => (BigInt(left.id) < BigInt(right.id) ? -1 : 1))
          .slice(0, request.limit)
          .reverse();
      }),
  });

const TestLayer = Layer.merge(
  TestDatabaseLayer({ types: [CrawlState.CrawlState, Person.Person, Topic.Topic, Trigger.Trigger] }),
  MemorySqlite.layerMemory,
);

/** Parameterized per test: the AI stand-in records the prompts it is sent into `prompts`. */
const crawlLayer = (discord: Layer.Layer<DiscordService.DiscordService>, prompts: string[]) =>
  Layer.mergeAll(discord, deterministicAiService(prompts));

/** The facts in the space's memory. */
const memoryFacts = MemoryService.MemoryService.use((memory) => memory.query(MemoryQuery.facts()));

/** The topics stage asks the model to name each conversation; every other prompt is fact extraction. */
const factPrompts = (prompts: readonly string[]) =>
  prompts.filter((prompt) => !prompt.includes('Name and summarize the topic'));

describe('CrawlDiscordChannels', () => {
  it.effect("back-indexes a channel into the space's memory as Kai, a page per model request, resumably", () =>
    Effect.gen(function* () {
      const history = new Map([[CHANNEL, [...HISTORY]]]);
      const reads: Read[] = [];
      const prompts: string[] = [];
      const state = yield* Database.add(CrawlState.make());
      const { db } = yield* Database.Service;
      const run = (maxSteps = 10) =>
        crawl
          .handler({ applicationId: KAI, channels: [CHANNEL], maxSteps, state: Ref.make(state) })
          .pipe(Effect.provide(crawlLayer(fakeDiscord(history, reads), prompts)));

      const first = yield* run();
      expect(first).toEqual({ done: true, errored: 0, steps: 2, messages: HISTORY.length });
      // Every read named Kai and this space; the page of three messages was one extraction request.
      expect(reads.every(({ bot }) => bot.applicationId === KAI && bot.spaceId === db.spaceId)).toBe(true);
      expect(factPrompts(prompts)).toHaveLength(1);
      const facts = yield* memoryFacts;
      expect(facts.length).toBeGreaterThan(0);
      // Facts cite the message they came from, except each author's profile, which cites the user.
      const sources = new Set(HISTORY.map(({ id }) => `discord:${id}`));
      const profiles = facts.filter((fact) => fact.extractor.id === 'agent-registry');
      expect(profiles.length).toBeGreaterThan(0);
      expect(
        facts.filter((fact) => !profiles.includes(fact)).every((fact) => sources.has(fact.attribution.source)),
      ).toBe(true);
      // The drained channel became a named topic in the space.
      const topics = yield* Database.query(Filter.type(Topic.Topic)).run;
      expect(topics).toEqual([expect.objectContaining({ threadId: CHANNEL, messageCount: HISTORY.length })]);
      expect(CrawlState.listTargets(state)).toEqual([
        expect.objectContaining({ id: CHANNEL, status: 'done', cursor: HISTORY.at(-1)?.id }),
      ]);
      expect(state.runStatus).toBe('done');
      expect(state.lastRun).toMatchObject({ steps: 2, messages: HISTORY.length, done: true });

      // The next run reopens the channel and reads only what was posted since.
      history.get(CHANNEL)?.push(message('1300000000000000004', 'Josiah', 'Josiah ships the Indexer on Monday.'));
      expect(yield* run()).toMatchObject({ done: true, messages: 1 });
      expect(factPrompts(prompts)).toHaveLength(2);

      // A reset re-reads the whole channel, and the unchanged messages cost no extraction request.
      const extracted = (yield* memoryFacts).length;
      Obj.update(state, (state) => CrawlState.resetTargets(state));
      expect(yield* run()).toMatchObject({ done: true, messages: HISTORY.length + 1 });
      expect(factPrompts(prompts)).toHaveLength(2);
      expect((yield* memoryFacts).length).toBe(extracted);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('stops after maxSteps and resumes from the committed cursor', () =>
    Effect.gen(function* () {
      const many = Array.from({ length: 30 }, (_, index) =>
        message(String(1300000000000000100n + BigInt(index)), 'Dima', `Note ${index} about the Indexer.`),
      );
      const prompts: string[] = [];
      const state = yield* Database.add(CrawlState.make());
      const run = crawl
        .handler({ applicationId: KAI, channels: [CHANNEL], maxSteps: 1, state: Ref.make(state) })
        .pipe(Effect.provide(crawlLayer(fakeDiscord(new Map([[CHANNEL, many]])), prompts)));

      // One step is one page of 25 messages.
      expect(yield* run).toMatchObject({ done: false, steps: 1, messages: 25 });
      expect(state.runStatus).toBe('running');
      expect(CrawlState.listTargets(state)[0].cursor).toBe(many[24].id);
      expect(yield* run).toMatchObject({ done: false, steps: 1, messages: 5 });
      expect(yield* run).toMatchObject({ done: true, steps: 1, messages: 0 });
      expect(factPrompts(prompts)).toHaveLength(2);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('records a read the bot host refuses on the channel instead of failing', () =>
    Effect.gen(function* () {
      const state = yield* Database.add(CrawlState.make());
      const refusing = Layer.succeed(DiscordService.DiscordService, {
        listChannels: () => Effect.succeed([]),
        fetchMessages: () =>
          Effect.fail(
            new DiscordService.DiscordServiceError({ message: 'This Discord bot does not serve the space.' }),
          ),
      });
      const result = yield* crawl
        .handler({ applicationId: KAI, channels: [CHANNEL], state: Ref.make(state) })
        .pipe(Effect.provide(crawlLayer(refusing, [])));
      expect(result).toMatchObject({ errored: 1, messages: 0 });
      expect(CrawlState.listTargets(state)).toEqual([
        expect.objectContaining({
          id: CHANNEL,
          status: 'error',
          lastError: expect.stringContaining('does not serve the space'),
        }),
      ]);
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('ConfigureBackIndex', () => {
  it.effect('creates the crawl state and remote timer trigger, then reconfigures them in place', () =>
    Effect.gen(function* () {
      const created = yield* configureBackIndex.handler({ applicationId: KAI, channels: ['c1', 'c2'], maxDays: 30 });
      const trigger = yield* Database.load(created.trigger);
      const state = yield* Database.load(created.state);
      expect(trigger).toMatchObject({ enabled: true, remote: true, spec: { kind: 'timer', cron: '*/2 * * * *' } });
      expect(trigger.input).toMatchObject({ applicationId: KAI, channels: ['c1', 'c2'], maxDays: 30 });
      expect(CrawlState.listTargets(state).map(({ id }) => id)).toEqual(['c1', 'c2']);

      const updated = yield* configureBackIndex.handler({
        applicationId: KAI,
        channels: ['c2', 'c3'],
        trigger: created.trigger,
        cron: '*/5 * * * *',
        enabled: false,
      });
      expect((yield* Database.load(updated.state)).id).toBe(state.id);
      expect(trigger).toMatchObject({ enabled: false, spec: { kind: 'timer', cron: '*/5 * * * *' } });
      expect(trigger.input?.channels).toEqual(['c2', 'c3']);
      expect(CrawlState.listTargets(state).map(({ id }) => id)).toEqual(['c2', 'c3']);
      expect(yield* Database.query(Filter.type(Trigger.Trigger)).run).toHaveLength(1);
    }).pipe(Effect.provide(TestLayer)),
  );
});
