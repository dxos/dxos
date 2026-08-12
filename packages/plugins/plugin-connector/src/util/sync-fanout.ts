//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { RunAgainError } from '@dxos/compute';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, type Ref } from '@dxos/echo';
import { type Connection, Cursor } from '@dxos/link';

import { connectionDeckSubject } from '../constants';
import { ConnectionAuthExpiredError, isUnauthorizedError } from '../errors';
import { isCursorForConnection } from './cursor-predicates';

/** How many of a connection's bindings sync at once. */
const SYNC_CONCURRENCY = 2;

/**
 * The shared fan-out every connector sync operation wraps: resolves the connection's external-sync
 * cursors and runs `sync` for each, bounded so a manual account sync doesn't hit the provider with a
 * burst of requests. `priority` (a cursor id, carried by a target's sync button via the trigger-event
 * template) sorts that binding to the front so the pressed target grabs a slot immediately while its
 * siblings queue.
 *
 * Continuation: a binding's `Operation.runAgain()` (a capped run with work left) is collected rather
 * than propagated, so one capped binding never starves the rest; after every binding had its turn it
 * is re-raised once at the operation level — a dispatcher-driven run (the account routine's trigger)
 * re-invokes the operation with the same event, and the durable per-binding cursors resume where
 * they left off. HTTP 401s are retagged {@link ConnectionAuthExpiredError} so the failure toast
 * offers reauthentication.
 *
 * `outputs` collects each binding's result in fan-out order, so an operation with a meaningful
 * output (e.g. new-message counts) can fold them.
 */
export const syncConnectionBindings = <A, E, R>({
  connection: connectionRef,
  priority,
  sync,
}: {
  connection: Ref.Ref<Connection.Connection>;
  priority?: string | undefined;
  sync: (binding: Cursor.ExternalCursor) => Effect.Effect<A, E, R>;
}): Effect.Effect<{ synced: number; outputs: A[] }, E | ConnectionAuthExpiredError, R> =>
  Effect.gen(function* () {
    const connectionTarget = connectionRef.target;
    const db = connectionTarget ? Obj.getDatabase(connectionTarget) : undefined;
    if (!db) {
      return { synced: 0, outputs: [] };
    }

    const connection = yield* Database.load(connectionRef).pipe(Effect.provide(Database.layer(db)), Effect.orDie);
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run.pipe(
      Effect.provide(Database.layer(db)),
      Effect.map((results) =>
        results.filter((cursor): cursor is Cursor.ExternalCursor => isCursorForConnection(cursor, connection)),
      ),
      Effect.orElseSucceed((): Cursor.ExternalCursor[] => []),
    );

    const ordered = priority ? [...cursors].sort((a, b) => rank(a, priority) - rank(b, priority)) : cursors;

    // Serialized invocation the reauth toast runs on click — data (operation key + input), not a live
    // callback, since it rides on the error across the process boundary.
    const openConnection = Operation.prepare(LayoutOperation.Open, {
      subject: [connectionDeckSubject(GraphPath.getSpacePath(db.spaceId), connection.id)],
      navigation: 'immediate',
    });

    // Whether any binding requested continuation — re-raised once at the end (see doc comment).
    let wantsRerun = false;

    const outputs = yield* Effect.all(
      ordered.map((binding) =>
        sync(binding).pipe(
          // `Process.fromOperation` promotes any handler failure to a defect (`Effect.orDie`), so
          // retagging 401s must intercept the defect channel — `Effect.mapError` never sees it.
          Effect.catchAllDefect((defect) =>
            RunAgainError.is(defect)
              ? Effect.sync((): A | undefined => {
                  wantsRerun = true;
                  return undefined;
                })
              : isUnauthorizedError(defect)
                ? Effect.fail(
                    new ConnectionAuthExpiredError({
                      connectionId: connection.id,
                      action: openConnection,
                      cause: defect,
                    }),
                  )
                : Effect.die(defect),
          ),
        ),
      ),
      { concurrency: SYNC_CONCURRENCY },
    );

    if (wantsRerun) {
      // `runAgain` raises a defect; `orDie` collapses its phantom `void` error type.
      return yield* Operation.runAgain().pipe(Effect.orDie);
    }

    return {
      synced: cursors.length,
      outputs: outputs.filter((output): output is A => output !== undefined),
    };
  });

/** Priority cursor first; otherwise keep query order. */
const rank = (cursor: Cursor.ExternalCursor, priority: string): number => (cursor.id === priority ? 0 : 1);
