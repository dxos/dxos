//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, vi } from 'vitest';

import * as Credential from '@dxos/compute/Credential';
import * as Trigger from '@dxos/compute/Trigger';
import { CrawlState } from '@dxos/crawler';
import { deterministicAiService } from '@dxos/crawler/testing';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { AccessToken, Connection } from '@dxos/link';
import * as FactFeed from '@dxos/plugin-agent/FactFeed';

import { DISCORD_SOURCE, DISCORD_USER_PROVIDER_ID } from '../constants.ts';
import { DiscordEndpoint } from '../services/index.ts';
import { FAKE_API_BASE, type FakeMessage, makeFakeRest } from '../testing/fake-rest.ts';
import configureBackIndex from './configure-back-index.ts';
import crawl from './crawl.ts';

const CHANNEL = '900000000000000002';
const TOKEN = 'oauth-token';

const message = (id: string, author: string, content: string): FakeMessage => ({
  id,
  content,
  timestamp: '2026-09-01T10:00:00.000Z',
  author: { id: `7000${author.length}`, username: author.toLowerCase(), global_name: author },
});

const HISTORY = [
  message('1300000000000000001', 'Dima', 'Dima owns the Indexer service and rewrites its Migration runner.'),
  message('1300000000000000002', 'Josiah', 'Josiah reviews the Migration runner rewrite.'),
  message('1300000000000000003', 'Dima', 'The Indexer migration is scheduled for Friday.'),
];

/** The space's token: inline on the `AccessToken`, as a Discord OAuth sign-in stores it. */
const credentials = Layer.succeed(Credential.CredentialsService, {
  getCredential: async () => ({ service: DISCORD_SOURCE, apiKey: TOKEN }),
  queryCredentials: async () => [{ service: DISCORD_SOURCE, apiKey: TOKEN }],
});

const TestLayer = TestDatabaseLayer({
  types: [AccessToken.AccessToken, Connection.Connection, CrawlState.CrawlState, FactFeed.FactItem, Trigger.Trigger],
});

/** The space as a Discord OAuth sign-in leaves it, with a crawl state and fact feed. */
const setup = Effect.gen(function* () {
  const accessToken = yield* Database.add(Obj.make(AccessToken.AccessToken, { source: DISCORD_SOURCE, token: TOKEN }));
  const connection = yield* Database.add(
    Connection.make({ connectorId: DISCORD_USER_PROVIDER_ID, accessToken: Ref.make(accessToken) }),
  );
  const state = yield* Database.add(CrawlState.make());
  const feed = yield* Database.add(Feed.make({ name: 'facts' }));
  return { connection, state, feed };
});

const factItems = (feed: Feed.Feed) => Feed.query(feed, Filter.type(FactFeed.FactItem)).run;

describe('CrawlDiscordChannels', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.effect('back-indexes a channel into the fact feed, a page per model request, resumably', () =>
    Effect.gen(function* () {
      const history = new Map([[CHANNEL, [...HISTORY]]]);
      const rest = makeFakeRest(history);
      vi.stubGlobal('fetch', rest.fetch);
      const prompts: string[] = [];
      const { connection, state, feed } = yield* setup;
      const run = (maxSteps = 10) =>
        crawl
          .handler({
            connection: Ref.make(connection),
            channels: [CHANNEL],
            maxSteps,
            state: Ref.make(state),
            facts: Ref.make(feed),
          })
          .pipe(
            Effect.provide(Layer.merge(credentials, deterministicAiService(prompts))),
            Effect.provideService(DiscordEndpoint, { baseUrl: FAKE_API_BASE, via: 'direct' }),
          );

      const first = yield* run();
      expect(first).toEqual({ done: true, errored: 0, steps: 2, messages: HISTORY.length });
      // The page of three messages was one model request; the OAuth token went as a bearer token.
      expect(prompts).toHaveLength(1);
      expect(rest.calls.every(({ authorization }) => authorization === `Bearer ${TOKEN}`)).toBe(true);
      const items = yield* factItems(feed);
      expect(items.length).toBeGreaterThan(0);
      const sources = new Set(HISTORY.map(({ id }) => `discord:${id}`));
      expect(items.every(({ fact }) => sources.has(fact.attribution.source))).toBe(true);
      expect(CrawlState.listTargets(state)).toEqual([
        expect.objectContaining({ id: CHANNEL, status: 'done', cursor: HISTORY.at(-1)?.id }),
      ]);
      expect(state.runStatus).toBe('done');
      expect(state.messages).toBe(HISTORY.length);
      expect(state.lastRun).toMatchObject({ steps: 2, messages: HISTORY.length, done: true });

      // The next run reopens the channel and reads only what was posted since.
      const posted = message('1300000000000000004', 'Josiah', 'Josiah ships the Indexer on Monday.');
      history.get(CHANNEL)?.push(posted);
      expect(yield* run()).toMatchObject({ done: true, messages: 1 });
      expect(prompts).toHaveLength(2);

      // A reset re-reads the whole channel, and the unchanged messages cost no model request.
      const extracted = (yield* factItems(feed)).length;
      CrawlState.resetTargets(state);
      expect(yield* run()).toMatchObject({ done: true, messages: HISTORY.length + 1 });
      expect(prompts).toHaveLength(2);
      expect((yield* factItems(feed)).length).toBe(extracted);
      expect(state.messages).toBe(2 * HISTORY.length + 2);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('stops after maxSteps and resumes from the committed cursor', () =>
    Effect.gen(function* () {
      const many = Array.from({ length: 30 }, (_, index) =>
        message(String(1300000000000000100n + BigInt(index)), 'Dima', `Note ${index} about the Indexer.`),
      );
      vi.stubGlobal('fetch', makeFakeRest(new Map([[CHANNEL, many]])).fetch);
      const prompts: string[] = [];
      const { connection, state, feed } = yield* setup;
      const run = crawl
        .handler({
          connection: Ref.make(connection),
          channels: [CHANNEL],
          maxSteps: 1,
          state: Ref.make(state),
          facts: Ref.make(feed),
        })
        .pipe(
          Effect.provide(Layer.merge(credentials, deterministicAiService(prompts))),
          Effect.provideService(DiscordEndpoint, { baseUrl: FAKE_API_BASE, via: 'direct' }),
        );

      // One step is one page of 25 messages.
      expect(yield* run).toMatchObject({ done: false, steps: 1, messages: 25 });
      expect(state.runStatus).toBe('running');
      expect(CrawlState.listTargets(state)[0].cursor).toBe(many[24].id);
      expect(yield* run).toMatchObject({ done: false, steps: 1, messages: 5 });
      expect(yield* run).toMatchObject({ done: true, steps: 1, messages: 0 });
      expect(prompts).toHaveLength(2);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('records a failure in the crawl state instead of failing', () =>
    Effect.gen(function* () {
      const { connection, state, feed } = yield* setup;
      const result = yield* crawl
        .handler({
          connection: Ref.make(connection),
          channels: [CHANNEL],
          state: Ref.make(state),
          facts: Ref.make(feed),
        })
        .pipe(
          Effect.provide(
            Layer.merge(
              Layer.succeed(Credential.CredentialsService, {
                getCredential: async () => {
                  throw new Error('no token');
                },
                queryCredentials: async () => [],
              }),
              deterministicAiService([]),
            ),
          ),
        );
      expect(result.error).toMatch(/no token/);
      expect(state.runStatus).toBe('error');
      expect(state.lastRun?.error).toMatch(/no token/);
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('ConfigureBackIndex', () => {
  it.effect('creates the crawl state, fact feed and remote timer trigger, then reconfigures them in place', () =>
    Effect.gen(function* () {
      const { connection } = yield* setup;
      const created = yield* configureBackIndex.handler({
        connection: Ref.make(connection),
        channels: ['c1', 'c2'],
        maxDays: 30,
      });
      const trigger = yield* Database.load(created.trigger);
      const state = yield* Database.load(created.state);
      expect(trigger).toMatchObject({ enabled: true, remote: true, spec: { kind: 'timer', cron: '*/2 * * * *' } });
      expect(trigger.input).toMatchObject({ channels: ['c1', 'c2'], maxDays: 30 });
      expect(CrawlState.listTargets(state).map(({ id }) => id)).toEqual(['c1', 'c2']);

      const updated = yield* configureBackIndex.handler({
        connection: Ref.make(connection),
        channels: ['c2', 'c3'],
        trigger: created.trigger,
        cron: '*/5 * * * *',
        enabled: false,
      });
      expect((yield* Database.load(updated.state)).id).toBe(state.id);
      expect((yield* Database.load(updated.facts)).id).toBe((yield* Database.load(created.facts)).id);
      expect(trigger).toMatchObject({ enabled: false, spec: { kind: 'timer', cron: '*/5 * * * *' } });
      expect(trigger.input?.channels).toEqual(['c2', 'c3']);
      expect(CrawlState.listTargets(state).map(({ id }) => id)).toEqual(['c2', 'c3']);
      expect(yield* Database.query(Filter.type(Trigger.Trigger)).run).toHaveLength(1);
    }).pipe(Effect.provide(TestLayer)),
  );
});
