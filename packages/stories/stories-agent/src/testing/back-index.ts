//
// Copyright 2026 DXOS.org
//

import * as Trigger from '@dxos/compute/Trigger';
import * as CrawlState from '@dxos/crawler/CrawlState';
import { type Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import * as FactFeed from '@dxos/plugin-agent/FactFeed';

//
// Fakes for the scripted back-index story: EDGE's trigger run of `CrawlDiscordChannels`, and the brain's fact feed
// routes (`/compute/brain/:spaceId/:agent/fact-feeds`).
//

/** Messages and facts one fake step reads and extracts. */
const MESSAGES_PER_STEP = 25;
const FACTS_PER_STEP = 2;

/** How often the fake trigger runs. */
const TICK_MS = 400;

/** A fact citing a fake message, as the extractor would store it. */
const fakeFact = (target: string, step: number): Parameters<typeof FactFeed.makeItem>[0] => ({
  id: `fact-${target}-${step}-${Math.random().toString(36).slice(2)}`,
  assertion: {
    subject: { kind: 'entity', entity: 'dima', label: 'Dima' },
    predicate: 'mentions',
    object: { kind: 'literal', literal: `step ${step}` },
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: `discord:${target}-${step}`, generatedAtTime: new Date().toISOString() },
  recordedAt: new Date().toISOString(),
  extractor: { id: 'fake', model: 'fake', version: '0' },
  sourceHash: `${target}-${step}`,
});

/**
 * Stands in for EDGE running the back-index trigger: while the space's back-index trigger is enabled, each tick moves
 * the top actionable target of its crawl state one step (pending -> active -> done), appends facts to its fact feed,
 * and spawns one thread under a finished channel when the trigger's input descends threads. Returns a stop function that
 * waits for a step in flight.
 */
export const startFakeBackIndexRunner = (db: Database.Database): (() => Promise<void>) => {
  let step = 0;
  let running: Promise<void> | undefined;
  const tick = async () => {
    const [trigger] = (await db.query(Filter.type(Trigger.Trigger)).run()).filter(
      (candidate) => candidate.enabled && Ref.isRef(candidate.input?.state),
    );
    const input = trigger?.input;
    if (!input || !Ref.isRef(input.state) || !Ref.isRef(input.facts)) {
      return;
    }
    const state = await input.state.load();
    const feed = await input.facts.load();
    if (!Obj.instanceOf(CrawlState.CrawlState, state) || !Obj.instanceOf(Feed.Feed, feed)) {
      return;
    }
    const target = CrawlState.listTargets(state)
      .reverse()
      .find(({ status }) => status === 'pending' || status === 'active');
    if (!target) {
      Obj.update(state, (state) => CrawlState.setRunStatus(state, 'done'));
      return;
    }
    step++;
    Obj.update(state, (state) => {
      CrawlState.setRunStatus(state, 'running');
      CrawlState.setCursor(state, target.id, `m${step}`, new Date().toISOString());
      CrawlState.setStatus(state, target.id, target.status === 'pending' ? 'active' : 'done');
      if (target.status === 'active' && target.depth === 0 && input.descendThreads !== false) {
        CrawlState.pushTargets(state, [
          {
            id: `${target.channelId}1`,
            channelId: `${target.channelId}1`,
            threadId: `${target.channelId}1`,
            parentMessageId: `${target.channelId}-m1`,
            depth: 1,
            status: 'pending',
          },
        ]);
      }
    });
    await db.appendToFeed(
      feed,
      Array.from({ length: FACTS_PER_STEP }, () => FactFeed.makeItem(fakeFact(target.id, step))),
    );
    Obj.update(state, (state) =>
      CrawlState.recordRun(state, {
        at: new Date().toISOString(),
        steps: 1,
        messages: MESSAGES_PER_STEP,
        done: false,
        errored: 0,
      }),
    );
  };
  const interval = setInterval(() => {
    // One step at a time: a slow append must not overlap the next tick.
    if (!running) {
      running = tick().finally(() => {
        running = undefined;
      });
    }
  }, TICK_MS);
  return async () => {
    clearInterval(interval);
    await running;
  };
};

/** What signing in with Discord leaves in the space: a user OAuth connection holding its token. */
export const addDiscordConnection = (db: Database.Database): Connection.Connection => {
  const accessToken = db.add(Obj.make(AccessToken.AccessToken, { source: 'discord.com', token: 'fake-oauth-token' }));
  return db.add(Connection.make({ connectorId: 'discord-user', accessToken: Ref.make(accessToken) }));
};

/** The verbs the fake brain received, oldest first. */
export type FakeBrainCall = { method: string; agent: string; feed?: string };

export type FakeBrain = { calls: FakeBrainCall[]; restore: () => void };

const FACT_FEEDS_PATH = /\/compute\/brain\/[^/]+\/([^/]+)\/fact-feeds$/;

const json = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } });

/**
 * Stands in for EDGE's brain fact feed routes by wrapping `fetch`, keeping the registered feeds in memory. EDGE's
 * `/auth` challenge answers 404 so the client proceeds unauthenticated instead of reaching a real EDGE.
 */
export const installFakeBrain = (): FakeBrain => {
  const original = globalThis.fetch;
  const calls: FakeBrainCall[] = [];
  const feeds = new Set<string>();
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === '/auth') {
      return new Response(null, { status: 404 });
    }
    const match = url.pathname.match(FACT_FEEDS_PATH);
    if (!match) {
      return original(input, init);
    }
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    const posted =
      typeof body === 'object' && body !== null && 'feed' in body && typeof body.feed === 'string'
        ? body.feed
        : undefined;
    const feed = posted ?? url.searchParams.get('feed') ?? undefined;
    calls.push({ method, agent: decodeURIComponent(match[1]), ...(feed ? { feed } : {}) });
    if (method === 'POST' && feed) {
      feeds.add(feed);
    } else if (method === 'DELETE' && feed) {
      feeds.delete(feed);
    }
    return json({ feeds: [...feeds] });
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
};
