//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { AgentOperation } from '#types';

import { callCrawl } from './crawl-client.ts';

const handler: Operation.WithHandler<typeof AgentOperation.ConfigureCrawl> = AgentOperation.ConfigureCrawl.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent, applicationId, channels, descendThreads, maxDepth, maxDays, factFeed }) {
      // EDGE appends to the feed by its EID, which it cannot resolve from a ref.
      const feed = factFeed ? yield* Database.load(factFeed) : undefined;
      const body = {
        applicationId,
        channels: [...channels],
        ...(descendThreads !== undefined ? { descendThreads } : {}),
        ...(maxDepth !== undefined ? { maxDepth } : {}),
        ...(maxDays !== undefined ? { maxDays } : {}),
        ...(feed ? { factFeed: Obj.getURI(feed) } : {}),
      };
      return yield* callCrawl(agent, (edge, ctx, { spaceId, agentId }) => edge.putCrawl(ctx, spaceId, agentId, body));
    }),
  ),
);

export default handler;
