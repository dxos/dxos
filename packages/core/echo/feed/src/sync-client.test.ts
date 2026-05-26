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
    const error = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
    expect(Option.isSome(error) && error.value instanceof SyncRpcTimeoutError).toBe(true);

    await runtime.dispose();
  });
});
