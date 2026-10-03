//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Ref } from '@dxos/echo';

import { Relay, RelayOperation } from '#types';

const handler: Operation.WithHandler<typeof RelayOperation.ListRelays> = RelayOperation.ListRelays.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, status }) {
      const agent = yield* Database.load(agentRef).pipe(Effect.orDie);
      // A child-of filter rather than `.children()`, which EDGE's query planner cannot run.
      const relays = yield* Database.query(Filter.and(Filter.type(Relay.Relay), Filter.childOf(agent))).run;
      const now = Date.now();
      return {
        relays: relays
          .filter((relay) => status === undefined || relay.status === status)
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((relay): RelayOperation.ListedRelay => ({
            relay: Ref.make(relay),
            recipient: relay.recipient,
            requester: relay.requester,
            message: relay.message,
            status: relay.status,
            dueAt: relay.dueAt,
            overdue: Relay.isOverdue(relay, now),
            replyChannelId: relay.replyChannelId,
            outcome: relay.outcome,
          })),
      };
    }),
  ),
);

export default handler;
