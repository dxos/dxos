//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';

import { GOOGLE_INTEGRATION_SOURCE } from '../../../constants';
import { CalendarForeignKeyWrongTypeError } from '../../../errors';
import { Calendar, InboxOperation } from '../../../types';

/**
 * Eagerly materializes a local Calendar for a selected remote Google calendar so a
 * {@link SyncBinding} can be created (relations require both endpoints to exist).
 * Find-or-create keyed on the calendar's foreign key, so re-running for the same
 * remote calendar returns the existing Calendar (with its name refreshed).
 * When `existingTarget` is supplied, that Calendar is used directly and its name
 * is updated to match the remote calendar rather than searching by foreign key.
 */
const handler: Operation.WithHandler<typeof InboxOperation.MaterializeCalendarTarget> =
  InboxOperation.MaterializeCalendarTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection, remoteTarget, existingTarget }) {
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

        if (existingTarget) {
          return yield* Effect.gen(function* () {
            const calendar = yield* Database.load(existingTarget);
            if (!Calendar.instanceOf(calendar)) {
              return yield* Effect.fail(new CalendarForeignKeyWrongTypeError());
            }
            if (calendar.name !== remoteTarget.name) {
              Obj.update(calendar, (cal) => {
                cal.name = remoteTarget.name;
              });
            }
            return { target: existingTarget };
          }).pipe(Effect.provide(Database.layer(db)));
        }

        return yield* findOrCreateCalendar(remoteTarget.id, remoteTarget.name).pipe(
          Effect.map((calendar) => ({ target: Ref.make(calendar) })),
          Effect.provide(Database.layer(db)),
        );
      }),
    ),
  );

export default handler;

/**
 * Find-or-create the local Calendar materialized for this remote calendar id.
 * Idempotent within a space — keyed by `Obj.Meta.keys` matching
 * `{ source: 'google.com', id }`.
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
        Obj.update(candidate, (cal) => {
          cal.name = name;
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
