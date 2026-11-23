//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';
import { type EdgeFunctionEnv, type FeedProtocol } from '@dxos/protocols';

import { FeedServiceImpl } from './feed-service-impl.ts';

const request: FeedProtocol.InsertIntoFeedRequest = {
  subspaceTag: 'data',
  spaceId: 'space',
  feedId: 'feed',
  objects: ['{"id":"one"}', '{"id":"two"}'],
};

/** A queue service whose insert resolves to `result`, released as Workers RPC results are. */
const queueService = (result: FeedProtocol.InsertIntoFeedResponse | undefined): EdgeFunctionEnv.QueueService => {
  const disposable = { [Symbol.dispose]: () => {} };
  return {
    queryQueue: async () => ({ objects: [], nextCursor: '', prevCursor: '', ...disposable }),
    insertIntoQueue: async () => (result ? { ...result, ...disposable } : disposable),
    deleteFromQueue: async () => disposable,
  };
};

describe('FeedServiceImpl', () => {
  test('passes on the block ids and predecessors the queue service reports', async ({ expect }) => {
    const reported = { blocks: ['1@actor', '2@actor'], predecessors: ['0@actor', null] };
    const impl = new FeedServiceImpl({}, queueService(reported));
    const response = await EffectEx.runPromise(impl['FeedService.insertIntoFeed'](request));
    // A writer confirms a fork from these, so they must reach it in request order.
    expect(response).toEqual(reported);
  });

  test('answers nothing for a queue service that reports nothing', async ({ expect }) => {
    const impl = new FeedServiceImpl({}, queueService(undefined));
    const response = await EffectEx.runPromise(impl['FeedService.insertIntoFeed'](request));
    expect(response).toEqual({});
  });
});
