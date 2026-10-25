//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as SqlService from '@dxos/compute/SqlService';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { PublicKey } from '@dxos/keys';
import { layerMemory } from '@dxos/sql-sqlite/Platform';
import { Reducer, Trajectory } from '@dxos/trajectory';
import { Message } from '@dxos/types';

import * as AiContext from './AiContext.ts';
import * as TrajectoryCache from './TrajectoryCache.ts';
import * as TrajectoryStore from './TrajectoryStore.ts';

const say = (text: string, role: Trajectory.Role = 'assistant') =>
  Trajectory.make({ payload: { _tag: 'message', blocks: [{ _tag: 'text', text }] }, sender: { role } });

const SqlLayer = Layer.provideMerge(SqlService.layerGuarded, layerMemory);

/**
 * A conversation feed is made with indexing off, so the host answers its reads from the feed store. A writer's own
 * queries see what it appended without asking the host, so every read here goes through a second client.
 */
describe('TrajectoryStore on a feed with indexing disabled', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  const openSpace = async () => {
    const peer = await builder.createPeer({
      types: [Feed.Feed, Message.Message, Trajectory.Event, ...TrajectoryStore.types],
      assignQueuePositions: true,
    });
    const spaceKey = PublicKey.random();
    const db = await peer.createDatabase(spaceKey);
    const reader = await peer.openDatabase(spaceKey, undefined, { client: await peer.createClient() });
    const feed = db.add(TrajectoryStore.makeFeed());
    await db.flush();
    return { db, reader, feed };
  };

  const run = <A>(db: EchoDatabase, effect: Effect.Effect<A, never, Database.Service>) =>
    EffectEx.runPromise(effect.pipe(Effect.provide(Database.layer(db))));

  /** The feed as the reader holds it, once replicated. */
  const feedOf = async (reader: EchoDatabase, feed: Feed.Feed) => {
    const [found] = await reader.query(Filter.id(feed.id)).run();
    return found !== undefined && Obj.instanceOf(Feed.Feed, found) ? found : undefined;
  };

  test('reads, folds and resumes a conversation from the feed store', async ({ expect }) => {
    const { db, reader, feed } = await openSpace();
    expect(feed.indexing).toEqual({ enabled: false });
    await run(db, TrajectoryStore.append(feed, [say('question', 'user'), say('answer')]));
    await db.flush({ secondaryIndexes: true });

    const readerFeed = await feedOf(reader, feed);
    expect(readerFeed).toBeDefined();
    if (readerFeed === undefined) {
      return;
    }
    const texts = (messages: readonly Message.Message[]) => messages.map((message) => Message.extractText(message));
    expect(texts(await run(reader, TrajectoryStore.messages(readerFeed)))).toEqual(['question', 'answer']);
    const events = await run(reader, TrajectoryStore.read(readerFeed));
    expect(events.map((event) => event.payload._tag)).toEqual(['message', 'message']);
    expect(events.every((event) => Feed.getLocalCursor(event) !== undefined)).toBe(true);

    // The checkpoint cache resumes from the local cursor it stored, and folds only what came after.
    const withSql = <A>(effect: Effect.Effect<A, never, Database.Service>) =>
      EffectEx.runPromise(effect.pipe(Effect.provide(Layer.merge(Database.layer(reader), SqlLayer))));
    expect((await withSql(TrajectoryCache.load(readerFeed, Reducer.thread))).state.items).toHaveLength(2);
    await run(db, TrajectoryStore.append(feed, [say('follow-up', 'user')]));
    await db.flush({ secondaryIndexes: true });
    TrajectoryCache.forget(reader);
    const resumed = await withSql(TrajectoryCache.load(readerFeed, Reducer.thread));
    expect(resumed.count).toBe(3);
    expect(resumed.state).toEqual(
      Reducer.run(Reducer.thread, await run(reader, TrajectoryStore.read(readerFeed))).state,
    );
  });

  test('bound objects and connections are read from the feed store', async ({ expect }) => {
    const { db, reader, feed } = await openSpace();
    const subject = db.add(Obj.make(Feed.Feed, { name: 'subject' }));
    const connection = db.add(Obj.make(Feed.Feed, { name: 'connection' }));
    await run(
      db,
      TrajectoryStore.append(feed, [
        Trajectory.make({
          payload: {
            _tag: 'contextBind',
            skills: [],
            objects: [Ref.make(subject)],
            connections: [Ref.make(connection)],
          },
          sender: { role: 'event', name: 'context' },
        }),
      ]),
    );
    await db.flush({ secondaryIndexes: true });

    const readerFeed = await feedOf(reader, feed);
    expect(readerFeed).toBeDefined();
    if (readerFeed === undefined) {
      return;
    }
    expect((await run(reader, AiContext.boundObjects(readerFeed))).map((ref) => ref.uri)).toEqual([
      Ref.make(subject).uri,
    ]);
    const states = await run(reader, AiContext.boundConnections(readerFeed));
    expect([...states.values()]).toEqual([true]);
  });
});
