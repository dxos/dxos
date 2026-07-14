//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';

import { GOOGLE_INTEGRATION_SOURCE } from '../../../../constants';
import { CalendarForeignKeyWrongTypeError } from '../../../../errors';
import { Calendar, InboxOperation } from '../../../../types';

/**
 * Find-or-create the local Calendar materialized for this remote calendar id.
 * Idempotent within a space — keyed by `Obj.Meta.keys` matching
 * `{ source: 'com.google', id }`.
 */
const findOrCreateCalendar = (remoteId: string, name: string) =>
  Effect.gen(function* () {
    const existing = yield* Database.query(
      Query.select(Filter.foreignKeys(Calendar.Calendar, [{ source: GOOGLE_INTEGRATION_SOURCE, id: remoteId }])),
    ).run;
    if (existing.length > 0) {
      const candidate = existing[0];
      // TODO(wittjosiah): Filter.foreignKeys typing may not narrow to Calendar; drop guard if it does.
      if (!Calendar.instanceOf(candidate)) {
        return yield* Effect.fail(new CalendarForeignKeyWrongTypeError());
      }
      if (candidate.name !== name) {
        Obj.update(candidate, (candidate) => {
          candidate.name = name;
        });
      }
      return candidate;
    }
    const calendar = Calendar.make({
      [Obj.Meta]: { keys: [{ source: GOOGLE_INTEGRATION_SOURCE, id: remoteId }] },
      name,
    });
    return yield* Database.add(calendar);
  });

/**
 * Eagerly materializes a local Calendar for a selected remote Google calendar so a
 * {@link SyncBinding} can be created (relations require both endpoints to exist).
 * Find-or-create keyed on the calendar's foreign key, so re-running for the same
 * remote calendar returns the existing Calendar (with its name refreshed).
 */
const handler: Operation.WithHandler<typeof InboxOperation.MaterializeCalendarTarget> =
  InboxOperation.MaterializeCalendarTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection, remoteTarget }) {
        if (!remoteTarget) {
          // Calendar is a multi-target connector; a calendar selection is always present.
          return yield* Effect.fail(new CalendarForeignKeyWrongTypeError());
        }
        // TODO(wittjosiah): the operation should just depend on `Database.Service` and
        //   have it provided by the OperationInvoker — composer's invoker is wired
        //   without a `databaseResolver`, so we derive the db from the connection ref's
        //   target and provide `Database.layer(db)` ourselves.
        const db = connection.target ? Obj.getDatabase(connection.target) : undefined;
        if (!db) {
          return yield* Effect.fail(new CalendarForeignKeyWrongTypeError());
        }

        return yield* findOrCreateCalendar(remoteTarget.id, remoteTarget.name).pipe(
          Effect.map((calendar) => ({ target: Ref.make(calendar) })),
          Effect.provide(Database.layer(db)),
        );
      }),
    ),
  );

export default handler;
