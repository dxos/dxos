//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { AgentOperation } from '#types';

import { callFactFeeds } from './fact-feed-client.ts';

const handler: Operation.WithHandler<typeof AgentOperation.ListFactFeeds> = AgentOperation.ListFactFeeds.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent }) {
      const { feeds } = yield* callFactFeeds(agent, (edge, ctx, { spaceId, agent }) =>
        edge.listBrainFactFeeds(ctx, spaceId, agent),
      );
      return { feeds: [...feeds] };
    }),
  ),
);

export default handler;
