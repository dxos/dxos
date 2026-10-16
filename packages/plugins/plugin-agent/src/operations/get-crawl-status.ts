//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { AgentOperation } from '#types';

import { callCrawl } from './crawl-client.ts';

const handler: Operation.WithHandler<typeof AgentOperation.GetCrawlStatus> = AgentOperation.GetCrawlStatus.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent }) {
      return yield* callCrawl(agent, (edge, ctx, { spaceId, agentId }) => edge.getCrawlStatus(ctx, spaceId, agentId));
    }),
  ),
);

export default handler;
