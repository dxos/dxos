//
// Copyright 2026 DXOS.org
//

import * as Trigger from '@dxos/compute/Trigger';
import * as CrawlState from '@dxos/crawler/CrawlState';
import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { Fact, type MemoryService } from '@dxos/echo-memory';
import * as EffectEx from '@dxos/effect/EffectEx';
import { AccessToken, Connection } from '@dxos/link';

//
// A fake for the scripted back-index story: EDGE's trigger run of `CrawlDiscordChannels`.
//

/** Messages and facts one fake step reads and extracts. */
const MESSAGES_PER_STEP = 25;
const FACTS_PER_STEP = 2;

/** How often the fake trigger runs. */
const TICK_MS = 400;

/** A fact citing a fake message, as the extractor would store it. */
const fakeFact = (target: string, step: number): Fact.Fact =>
  Fact.make({
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
 * the top actionable target of its crawl state one step (pending → active → done), puts facts into the space's memory,
 * and spawns one thread under a finished channel when the trigger's input descends threads. Returns a stop function that
 * waits for a step in flight.
 */
export const startFakeBackIndexRunner = (
  db: Database.Database,
  memory: MemoryService.Service,
): (() => Promise<void>) => {
  let step = 0;
  let running: Promise<void> | undefined;
  const tick = async () => {
    const [trigger] = (await db.query(Filter.type(Trigger.Trigger)).run()).filter(
      (candidate) => candidate.enabled && Ref.isRef(candidate.input?.state),
    );
    const input = trigger?.input;
    if (!input || !Ref.isRef(input.state)) {
      return;
    }
    const state = await input.state.load();
    if (!Obj.instanceOf(CrawlState.CrawlState, state)) {
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
    await EffectEx.runPromise(memory.put(Array.from({ length: FACTS_PER_STEP }, () => fakeFact(target.id, step))));
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
