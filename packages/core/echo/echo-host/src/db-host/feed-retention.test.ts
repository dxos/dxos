//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { FeedStore } from '@dxos/feed';
import { EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';

import { createTestSqliteRuntime } from '../testing/index.ts';
import { FeedRetention } from './feed-retention.ts';

const DAY = 24 * 60 * 60 * 1000;
const trace = FeedProtocol.WellKnownNamespaces.trace;

describe('FeedRetention', () => {
  test('prunes old blocks of a policy namespace that the policy accepts', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(dispose);
    const run = RuntimeProvider.runPromise(runtime);
    const feedStore = new FeedStore({ localActorId: 'local', assignPositions: false });
    await run(feedStore.migrate());

    const spaceId = SpaceId.random();
    const feedId = EntityId.random();
    const now = Date.now();
    const kinds = ['operation', 'question', 'operation', 'operation'];
    await run(
      feedStore.append({
        requestId: 'seed',
        spaceId,
        feedNamespace: trace,
        blocks: kinds.map((kind, sequence) => ({
          feedId,
          actorId: 'remote',
          sequence,
          prevActorId: sequence > 0 ? 'remote' : null,
          prevSequence: sequence > 0 ? sequence - 1 : null,
          position: null,
          // The last block is recent; the others are ten days old.
          timestamp: sequence === kinds.length - 1 ? now : now - 10 * DAY,
          data: EchoFeedCodec.encode({ id: EntityId.random(), kind }),
        })),
      }),
    );

    const retention = new FeedRetention({
      feedStore,
      runtime,
      getSpaceIds: () => [spaceId],
      policies: [{ feedNamespace: trace, maxAgeMs: 7 * DAY, shouldPrune: (object) => object.kind === 'operation' }],
    });
    await retention.open(Context.default());
    onTestFinished(async () => {
      await retention.close();
    });

    expect(await retention.prune(now)).toBe(2);
    const remaining = await run(
      feedStore
        .query({ requestId: 'read', spaceId, feedNamespace: trace, query: { feedIds: [feedId] } })
        .pipe(Effect.map(({ blocks }) => blocks.map((block) => EchoFeedCodec.decodeBlock(block).kind))),
    );
    expect(remaining).toEqual(['question', 'operation']);
  });
});
