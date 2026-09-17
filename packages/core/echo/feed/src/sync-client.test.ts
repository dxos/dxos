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

import { SyncRpcTimeoutError } from './errors.ts';
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
