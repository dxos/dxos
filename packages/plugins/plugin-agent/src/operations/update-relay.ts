//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { Task } from '@dxos/types';

import { Relay, RelayOperation } from '#types';

const handler: Operation.WithHandler<typeof RelayOperation.UpdateRelay> = RelayOperation.UpdateRelay.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ relay: relayRef, status, outcome }) {
      const relay = yield* Database.load(relayRef).pipe(Effect.orDie);
      yield* applyStatus(relay, status, outcome);
      return { relay: Ref.make(relay) };
    }),
  ),
);

export default handler;

/** Moves the relay and its task together, so the agent's task list never disagrees with the relay. */
export const applyStatus = Effect.fnUntraced(function* (relay: Relay.Relay, status: Relay.Status, outcome?: string) {
  const now = new Date().toISOString();
  Obj.update(relay, (relay) => {
    relay.status = status;
    if (status === 'delivered' && relay.deliveredAt === undefined) {
      relay.deliveredAt = now;
    }
    if (status === 'reported') {
      relay.reportedAt = now;
    }
    if (outcome !== undefined) {
      relay.outcome = outcome;
    }
  });

  const task = yield* Database.load(relay.task).pipe(Effect.option);
  if (task._tag === 'Some') {
    Task.setStatus(task.value, Relay.taskStatus[status], {
      actor: { role: 'assistant' },
      description: outcome ? `Relay ${status}: ${outcome}` : `Relay ${status}.`,
    });
  }
});
