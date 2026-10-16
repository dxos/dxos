//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { AgentOperation } from '#types';

import { callCrawl } from './crawl-client.ts';

const handler: Operation.WithHandler<typeof AgentOperation.ResetCrawl> = AgentOperation.ResetCrawl.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent, targets }) {
      return yield* callCrawl(agent, (edge, ctx, { spaceId, agentId }) =>
        edge.resetCrawl(ctx, spaceId, agentId, targets ? { targets: [...targets] } : {}),
      );
    }),
  ),
);

export default handler;
