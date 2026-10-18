//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { AgentOperation } from '#types';

import { callFactFeeds } from './fact-feed-client.ts';

const handler: Operation.WithHandler<typeof AgentOperation.AddFactFeed> = AgentOperation.AddFactFeed.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent, feed: feedRef }) {
      // EDGE reads the feed by its EID, which it cannot resolve from a ref.
      const feed = yield* Database.load(feedRef);
      const { feeds } = yield* callFactFeeds(agent, (edge, ctx, { spaceId, agent }) =>
        edge.addBrainFactFeed(ctx, spaceId, agent, Obj.getURI(feed)),
      );
      return { feeds: [...feeds] };
    }),
  ),
);

export default handler;
