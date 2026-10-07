//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { Context } from '@dxos/context';
import { EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';

import { SyncAppendPositionMismatchError, SyncRpcTimeoutError, SyncSpaceDeletedError } from './errors.ts';
import { FeedStore } from './feed-store.ts';
import { SyncClient, type SyncClientOptions } from './sync-client.ts';

const WellKnownNamespaces = FeedProtocol.WellKnownNamespaces;

const TestLayer = SqliteClient.layer({
  filename: ':memory:',
});

describe('SyncClient', () => {
  test('times out when edge does not respond', async () => {
    const runtime = ManagedRuntime.make(TestLayer);
    const spaceId = SpaceId.random();
    const feedStore = new FeedStore({ localActorId: 'alice', assignPositions: false });
    await runtime.runPromise(feedStore.migrate());

    const syncClient = new SyncClient({
      peerId: 'client-peer',
      feedStore,
      rpcTimeoutMs: 50,
      sendMessage: () => Effect.void,
    });

    const ctx = new Context();
    onTestFinished(() => void ctx.dispose());

    const exit = await runtime.runPromiseExit(
      syncClient.peekPull(ctx, {
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      }),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    const error = Exit.isFailure(exit) ? Cause.findErrorOption(exit.cause) : Option.none();
    expect(Option.isSome(error) && error.value instanceof SyncRpcTimeoutError).toBe(true);

    await runtime.dispose();
  });

  // A cursor above the server's high-water mark was pulled from rows the server has since lost;
  // the token is unchanged, so only the mark reveals it.
  test('rewinds a cursor the server reports as beyond its high-water mark', async () => {
    const runtime = ManagedRuntime.make(TestLayer);
    const spaceId = SpaceId.random();
    const feedStore = new FeedStore({ localActorId: 'alice', assignPositions: false });
    await runtime.runPromise(feedStore.migrate());
    await runtime.runPromise(
      feedStore.setSyncState({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        lastPulledPosition: 10,
        serverToken: 'token',
      }),
    );

    // Pulled from the server before it lost everything above 3.
    await runtime.runPromise(
      feedStore.append({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        blocks: [3, 7].map((position) => ({
          feedId: 'feed-1',
          actorId: 'bob',
          sequence: position,
          prevActorId: null,
          prevSequence: null,
          position,
          timestamp: 0,
          data: new Uint8Array([position]),
        })),
      }),
    );

    const requests: FeedProtocol.QueryRequest[] = [];
    const syncClient: SyncClient = new SyncClient({
      peerId: 'client-peer',
      feedStore,
      sendMessage: (_ctx, message) => {
        if (message._tag !== 'QueryRequest') {
          return Effect.void;
        }
        requests.push(message);
        return syncClient.handleMessage({
          _tag: 'QueryResponse',
          requestId: message.requestId,
          nextCursor: FeedProtocol.FeedCursor.make('token|-1'),
          hasMore: false,
          blocks: [],
          serverToken: 'token',
          maxPosition: 3,
          senderPeerId: 'server-peer',
          recipientPeerId: 'client-peer',
        });
      },
    });

    const ctx = new Context();
    onTestFinished(() => void ctx.dispose());

    const pull = () => runtime.runPromise(syncClient.pull(ctx, { spaceId, feedNamespace: WellKnownNamespaces.data }));
    expect(await pull()).toEqual({ done: false });
    expect(requests[0].position).toEqual(10);
    expect(
      await runtime.runPromise(feedStore.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data })),
    ).toEqual({ lastPulledPosition: -1, serverToken: 'token', blocksToPull: 0 });
    // The block above the mark is a row the server lost; unpositioned, it is pushed again.
    const { blocks } = await runtime.runPromise(feedStore.query({ spaceId, feedNamespace: WellKnownNamespaces.data }));
    expect(blocks.map((block) => block.position)).toEqual([3, null]);

    // Replaying from the start against the same mark is simply caught up.
    expect(await pull()).toEqual({ done: true });
    expect(requests[1].position).toEqual(-1);

    await runtime.dispose();
  });

  // The replay guard exists so one replay is not restarted on every page; armed before the rewind
  // is written, a failed write left it set, and the next pull skipped its own rewind.
  test('a rewind that fails to persist does not block the next one', async () => {
    const runtime = ManagedRuntime.make(TestLayer);
    const spaceId = SpaceId.random();
    const feedStore = new FeedStore({ localActorId: 'alice', assignPositions: false });
    await runtime.runPromise(feedStore.migrate());
    await runtime.runPromise(
      feedStore.setSyncState({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        lastPulledPosition: 10,
        serverToken: 'token',
      }),
    );
    // Positions above the cursor come from push acknowledgements; the server has since lost them.
    await runtime.runPromise(
      feedStore.append({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        blocks: [11, 12].map((position) => ({
          feedId: 'feed-1',
          actorId: 'bob',
          sequence: position,
          prevActorId: null,
          prevSequence: null,
          position,
          timestamp: 0,
          data: new Uint8Array([position]),
        })),
      }),
    );

    // The first rewind dies before it is written, as a storage failure would.
    const persist = feedStore.setSyncState;
    let rewindFailures = 1;
    feedStore.setSyncState = (opts) =>
      opts.lastPulledPosition === -1 && rewindFailures-- > 0 ? Effect.die(new Error('write failed')) : persist(opts);

    // Each pull is answered with a re-issued position this replica already holds.
    const requests: FeedProtocol.QueryRequest[] = [];
    const syncClient: SyncClient = new SyncClient({
      peerId: 'client-peer',
      feedStore,
      sendMessage: (_ctx, message) => {
        if (message._tag !== 'QueryRequest') {
          return Effect.void;
        }
        requests.push(message);
        const position = 10 + requests.length;
        return syncClient.handleMessage({
          _tag: 'QueryResponse',
          requestId: message.requestId,
          nextCursor: FeedProtocol.FeedCursor.make('token|-1'),
          hasMore: false,
          blocks: [
            {
              feedId: 'feed-1',
              actorId: `carol-${position}`,
              sequence: 0,
              prevActorId: null,
              prevSequence: null,
              position,
              timestamp: 0,
              data: new Uint8Array([position]),
            },
          ],
          serverToken: 'token',
          maxPosition: 12,
          senderPeerId: 'server-peer',
          recipientPeerId: 'client-peer',
        });
      },
    });

    const ctx = new Context();
    onTestFinished(() => void ctx.dispose());
    const pull = () => runtime.runPromise(syncClient.pull(ctx, { spaceId, feedNamespace: WellKnownNamespaces.data }));
    const syncState = () =>
      runtime.runPromise(feedStore.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data }));

    await expect(pull()).rejects.toThrow('write failed');
    expect(await syncState()).toEqual({ lastPulledPosition: 10, serverToken: 'token', blocksToPull: 0 });

    // The second displacement must rewind too; a guard left armed by the failed write would have let
    // this pull advance the cursor past the re-issued positions instead.
    expect(await pull()).toEqual({ done: false });
    expect(await syncState()).toEqual({ lastPulledPosition: -1, serverToken: 'token', blocksToPull: 0 });

    await runtime.dispose();
  });

  // The guard that keeps one replay from restarting on every page must not hide a second rollback.
  // Within a replay the block at the cursor is the one the previous page wrote, so a different block
  // there means the server changed again underneath it, and the positions it re-issued below the
  // cursor are only reached by starting over.
  test('a replay restarts when the block at the cursor changes underneath it', async () => {
    const runtime = ManagedRuntime.make(TestLayer);
    const spaceId = SpaceId.random();
    const feedStore = new FeedStore({ localActorId: 'alice', assignPositions: false });
    await runtime.runPromise(feedStore.migrate());
    await runtime.runPromise(
      feedStore.setSyncState({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        lastPulledPosition: 10,
        serverToken: 'token',
      }),
    );

    const block = (actorId: string, position: number): FeedProtocol.Block => ({
      feedId: 'feed-1',
      actorId,
      sequence: position,
      prevActorId: null,
      prevSequence: null,
      position,
      timestamp: 0,
      data: new Uint8Array([position]),
    });
    const requests: FeedProtocol.QueryRequest[] = [];
    const syncClient: SyncClient = new SyncClient({
      peerId: 'client-peer',
      feedStore,
      sendMessage: (_ctx, message) => {
        if (message._tag !== 'QueryRequest') {
          return Effect.void;
        }
        requests.push(message);
        const reply = (fields: Partial<FeedProtocol.QueryResponse>) =>
          syncClient.handleMessage({
            _tag: 'QueryResponse',
            requestId: message.requestId,
            nextCursor: FeedProtocol.FeedCursor.make('token|-1'),
            hasMore: false,
            blocks: [],
            serverToken: 'token',
            senderPeerId: 'server-peer',
            recipientPeerId: 'client-peer',
            ...fields,
          });
        switch (requests.length) {
          // The server lost everything above 3: the cursor is beyond it, so the replay starts.
          case 1:
            return reply({ maxPosition: 3 });
          // The first page of the replay.
          case 2:
            return reply({ blocks: [block('bob', 0), block('bob', 1)], maxPosition: 3 });
          // Rolled back again and regrown past the cursor: another block sits at 1 now.
          default:
            return reply({
              blocks: [block('carol', 2)],
              maxPosition: 2,
              cursorBlock: { feedId: 'feed-1', actorId: 'carol', sequence: 1 },
            });
        }
      },
    });

    const ctx = new Context();
    onTestFinished(() => void ctx.dispose());
    const pull = () => runtime.runPromise(syncClient.pull(ctx, { spaceId, feedNamespace: WellKnownNamespaces.data }));
    const syncState = () =>
      runtime.runPromise(feedStore.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data }));

    expect(await pull()).toEqual({ done: false });
    expect(await syncState()).toEqual({ lastPulledPosition: -1, serverToken: 'token', blocksToPull: 0 });
    expect(await pull()).toEqual({ done: false });
    expect(await syncState()).toEqual({ lastPulledPosition: 1, serverToken: 'token', blocksToPull: 0 });

    // Advancing from 1 instead would leave carol's block at 1 unpulled for good.
    expect(await pull()).toEqual({ done: false });
    expect(requests[2].position).toBe(1);
    expect(await syncState()).toEqual({ lastPulledPosition: -1, serverToken: 'token', blocksToPull: 0 });

    await runtime.dispose();
  });

  // The server names the reason so the syncer can stop asking; a plain error would only be retried.
  test('an Error reply coded space_deleted fails the request with SyncSpaceDeletedError', async () => {
    const runtime = ManagedRuntime.make(TestLayer);
    const spaceId = SpaceId.random();
    const feedStore = new FeedStore({ localActorId: 'alice', assignPositions: false });
    await runtime.runPromise(feedStore.migrate());

    const syncClient: SyncClient = new SyncClient({
      peerId: 'client-peer',
      feedStore,
      sendMessage: (_ctx, message) =>
        syncClient.handleMessage({
          _tag: 'Error',
          requestId: message.requestId,
          message: 'space deleted',
          code: FeedProtocol.ErrorCode.SPACE_DELETED,
          senderPeerId: 'server-peer',
          recipientPeerId: 'client-peer',
        }),
    });

    const ctx = new Context();
    onTestFinished(() => void ctx.dispose());

    const exit = await runtime.runPromiseExit(
      syncClient.pull(ctx, { spaceId, feedNamespace: WellKnownNamespaces.data }),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(Cause.squash(exit.cause)).toBeInstanceOf(SyncSpaceDeletedError);
    }

    await runtime.dispose();
  });

  // Zipping a short reply against the batch used to position the head and leave the tail pending,
  // so the push returned not-done forever and nothing said why.
  test('fails a push whose reply carries fewer positions than blocks', async () => {
    const runtime = ManagedRuntime.make(TestLayer);
    const spaceId = SpaceId.random();
    const feedStore = new FeedStore({ localActorId: 'alice', assignPositions: false });
    await runtime.runPromise(feedStore.migrate());
    await runtime.runPromise(
      feedStore.append({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        blocks: [0, 1].map((sequence) => ({
          feedId: 'feed-1',
          actorId: 'alice',
          sequence,
          prevActorId: sequence === 0 ? null : 'alice',
          prevSequence: sequence === 0 ? null : sequence - 1,
          position: null,
          timestamp: 0,
          data: new Uint8Array([sequence]),
        })),
      }),
    );

    const syncClient: SyncClient = new SyncClient({
      peerId: 'client-peer',
      feedStore,
      sendMessage: (_ctx, message) => {
        if (message._tag !== 'AppendRequest') {
          return Effect.void;
        }
        return syncClient.handleMessage({
          _tag: 'AppendResponse',
          requestId: message.requestId,
          positions: [5],
          serverToken: 'token',
          senderPeerId: 'server-peer',
          recipientPeerId: 'client-peer',
        });
      },
    });

    const ctx = new Context();
    onTestFinished(() => void ctx.dispose());

    const exit = await runtime.runPromiseExit(
      syncClient.push(ctx, { spaceId, feedNamespace: WellKnownNamespaces.data }),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = Cause.squash(exit.cause);
      expect(error).toBeInstanceOf(SyncAppendPositionMismatchError);
      expect(error).toMatchObject({ message: expect.stringContaining('1 positions for 2 blocks') });
    }
    // Nothing was applied: the whole batch is still pending, not just its tail.
    const { blocks } = await runtime.runPromise(feedStore.query({ spaceId, feedNamespace: WellKnownNamespaces.data }));
    expect(blocks.map((block) => block.position)).toEqual([null, null]);

    await runtime.dispose();
  });

  // A server that predates the token reports none; treating that as a change would wipe positions
  // on every pull.
  test('keeps pulling incrementally from a server that reports no token', async () => {
    const runtime = ManagedRuntime.make(TestLayer);
    const spaceId = SpaceId.random();
    const feedStore = new FeedStore({ localActorId: 'alice', assignPositions: false });
    await runtime.runPromise(feedStore.migrate());
    await runtime.runPromise(
      feedStore.setSyncState({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        lastPulledPosition: 2,
        serverToken: 'token-from-a-newer-server',
      }),
    );

    const requests: FeedProtocol.QueryRequest[] = [];
    const syncClient: SyncClient = new SyncClient({
      peerId: 'client-peer',
      feedStore,
      sendMessage: (_ctx, message) => {
        if (message._tag !== 'QueryRequest') {
          return Effect.void;
        }
        requests.push(message);
        return syncClient.handleMessage({
          _tag: 'QueryResponse',
          requestId: message.requestId,
          nextCursor: FeedProtocol.FeedCursor.make('legacy|-1'),
          hasMore: false,
          blocks: [
            {
              feedId: 'feed-1',
              actorId: 'bob',
              sequence: 0,
              prevActorId: null,
              prevSequence: null,
              position: 3,
              timestamp: 0,
              data: new Uint8Array([1]),
            },
          ],
          senderPeerId: 'server-peer',
          recipientPeerId: 'client-peer',
        });
      },
    });

    const ctx = new Context();
    onTestFinished(() => void ctx.dispose());

    expect(
      await runtime.runPromise(syncClient.pull(ctx, { spaceId, feedNamespace: WellKnownNamespaces.data })),
    ).toEqual({ done: false });
    expect(requests[0].expectedServerToken).toEqual('token-from-a-newer-server');
    // Position advanced from the stored one rather than restarting, and the token was kept.
    expect(
      await runtime.runPromise(feedStore.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data })),
    ).toEqual({ lastPulledPosition: 3, serverToken: 'token-from-a-newer-server', blocksToPull: 0 });

    await runtime.dispose();
  });

  test('pull records the remote backlog left after each batch', async () => {
    const runtime = ManagedRuntime.make(TestLayer);
    const spaceId = SpaceId.random();
    const feedStore = new FeedStore({ localActorId: 'alice', assignPositions: false });
    await runtime.runPromise(feedStore.migrate());

    // An undefined batch goes unanswered, so that pull times out.
    const batches = [
      { hasMore: true, actorId: 'bob', position: 1 },
      { hasMore: false, actorId: 'carol', position: 2 },
      { hasMore: true, actorId: 'dave', position: 3 },
      undefined,
    ];
    let requestCount = 0;
    const syncClient: SyncClient = new SyncClient({
      peerId: 'client-peer',
      feedStore,
      rpcTimeoutMs: 50,
      sendMessage: (_ctx, message) => {
        const batch = batches[requestCount++];
        if (message._tag !== 'QueryRequest' || !batch) {
          return Effect.void;
        }
        const { hasMore, actorId, position } = batch;
        return syncClient.handleMessage({
          _tag: 'QueryResponse',
          requestId: message.requestId,
          nextCursor: FeedProtocol.FeedCursor.make('legacy|-1'),
          hasMore,
          blocks: [
            {
              feedId: 'feed-1',
              actorId,
              sequence: 0,
              prevActorId: null,
              prevSequence: null,
              position,
              timestamp: 0,
              data: new Uint8Array([position]),
            },
          ],
          senderPeerId: 'server-peer',
          recipientPeerId: 'client-peer',
        });
      },
    });

    const ctx = new Context();
    onTestFinished(() => void ctx.dispose());
    const opts = { spaceId, feedNamespace: WellKnownNamespaces.data };

    const backlog = async () => (await runtime.runPromise(feedStore.getSyncState(opts))).blocksToPull;

    await runtime.runPromise(syncClient.pull(ctx, opts));
    expect(await backlog()).toBe(1);
    await runtime.runPromise(syncClient.pull(ctx, opts));
    expect(await backlog()).toBe(0);
    await runtime.runPromise(syncClient.pull(ctx, opts));
    expect(await backlog()).toBe(1);
    // A failed pull learns nothing about the server, so it leaves the last estimate alone.
    expect(Exit.isFailure(await runtime.runPromiseExit(syncClient.pull(ctx, opts)))).toBe(true);
    expect(await backlog()).toBe(1);

    await runtime.dispose();
  });

  test('push waits for an in-flight pull on the same namespace but not on another', async () => {
    const runtime = ManagedRuntime.make(TestLayer);
    const spaceId = SpaceId.random();
    const feedStore = new FeedStore({ localActorId: 'alice', assignPositions: false });
    await runtime.runPromise(feedStore.migrate());
    await runtime.runPromise(
      feedStore.appendLocal([
        { spaceId, feedId: EntityId.random(), feedNamespace: WellKnownNamespaces.data, data: new Uint8Array([1]) },
      ]),
    );

    type SentMessage = Parameters<SyncClientOptions['sendMessage']>[1];
    const sent: SentMessage[] = [];
    const syncClient: SyncClient = new SyncClient({
      peerId: 'client-peer',
      feedStore,
      sendMessage: (_ctx, message) => Effect.sync(() => void sent.push(message)),
    });
    const request = (tag: SentMessage['_tag'], feedNamespace: string): SentMessage => {
      const message = sent.find((candidate) => candidate._tag === tag && candidate.feedNamespace === feedNamespace);
      if (!message) {
        throw new Error(`no ${tag} sent for ${feedNamespace}`);
      }
      return message;
    };
    const respond = (message: SentMessage) =>
      runtime.runPromise(
        syncClient.handleMessage(
          message._tag === 'QueryRequest'
            ? {
                _tag: 'QueryResponse',
                requestId: message.requestId,
                nextCursor: FeedProtocol.FeedCursor.make('legacy|-1'),
                hasMore: false,
                blocks: [],
                senderPeerId: 'server-peer',
                recipientPeerId: 'client-peer',
              }
            : {
                _tag: 'AppendResponse',
                requestId: message.requestId,
                positions: [0],
                senderPeerId: 'server-peer',
                recipientPeerId: 'client-peer',
              },
        ),
      );

    const ctx = new Context();
    onTestFinished(() => void ctx.dispose());
    const data = { spaceId, feedNamespace: WellKnownNamespaces.data };
    const trace = { spaceId, feedNamespace: WellKnownNamespaces.trace };

    const pull = runtime.runPromise(syncClient.pull(ctx, data));
    const push = runtime.runPromise(syncClient.push(ctx, data));
    const tracePull = runtime.runPromise(syncClient.pull(ctx, trace));

    await vi.waitFor(() => {
      request('QueryRequest', data.feedNamespace);
      request('QueryRequest', trace.feedNamespace);
    });
    // Unlocked, the push would already have read its unpositioned block and sent it.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(sent.some((message) => message._tag === 'AppendRequest')).toBe(false);

    await respond(request('QueryRequest', trace.feedNamespace));
    await tracePull;
    await respond(request('QueryRequest', data.feedNamespace));
    await pull;
    await respond(await vi.waitFor(() => request('AppendRequest', data.feedNamespace)));
    await push;

    await runtime.dispose();
  });
});
