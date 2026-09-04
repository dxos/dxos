//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { SyncRpcTimeoutError } from './errors';
import { FeedStore } from './feed-store';
import { SyncClient } from './sync-client';

const WellKnownNamespaces = FeedProtocol.WellKnownNamespaces;

const TestLayer = SqlTransaction.layer.pipe(
  Layer.provideMerge(
    SqliteClient.layer({
      filename: ':memory:',
    }),
  ),
);

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
    ).toEqual({ lastPulledPosition: 3, serverToken: 'token-from-a-newer-server' });

    await runtime.dispose();
  });
});
