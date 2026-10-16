//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { AgentOperation } from '#types';

import { callCrawl } from './crawl-client.ts';

const handler: Operation.WithHandler<typeof AgentOperation.PauseCrawl> = AgentOperation.PauseCrawl.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent }) {
      return yield* callCrawl(agent, (edge, ctx, { spaceId, agentId }) => edge.pauseCrawl(ctx, spaceId, agentId));
    }),
  ),
);

export default handler;
