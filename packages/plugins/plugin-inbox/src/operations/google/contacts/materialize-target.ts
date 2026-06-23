//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Collection, Database, Filter, Obj, Query, Ref } from '@dxos/echo';

import { GOOGLE_INTEGRATION_SOURCE } from '../../../constants';
import { InboxOperation } from '../../../types';

/**
 * Eagerly materializes a local Collection for a remote Google contact group so a
 * {@link SyncBinding} can be created (relations require both endpoints to exist).
 * Contacts have no dedicated root type — the Collection is the addressable local
 * root for the group; synced `Person` objects land directly in the space, keyed by
 * foreign id. Find-or-create keyed on the group's foreign key, so it is idempotent.
 */
const handler: Operation.WithHandler<typeof InboxOperation.MaterializeContactsTarget> =
  InboxOperation.MaterializeContactsTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection, remoteTarget }) {
        // TODO(wittjosiah): the operation should just depend on `Database.Service` and
        //   have it provided by the OperationInvoker — composer's invoker is wired
        //   without a `databaseResolver`, so we derive the db from the connection ref's
        //   target and provide `Database.layer(db)` ourselves.
        const db = connection.target ? Obj.getDatabase(connection.target) : undefined;
        if (!db) {
          return yield* Effect.fail(new SyncDatabaseMissingError());
        }

        // Contacts is a multi-target connector; fall back to the default group when no selection.
        const remoteId = remoteTarget?.id ?? 'myContacts';
        const name = remoteTarget?.name ?? 'Contacts';

        return yield* findOrCreateContactsCollection(remoteId, name).pipe(
          Effect.map((collection) => ({ target: Ref.make(collection) })),
          Effect.provide(Database.layer(db)),
        );
      }),
    ),
  );

export default handler;

/**
 * Find an existing Collection materialized for this contact group, or create one
 * keyed by the group's foreign key. Idempotent within a space.
 */
const findOrCreateContactsCollection = (remoteId: string, name: string) =>
  Effect.gen(function* () {
    const existing = yield* Database.query(
      Query.select(Filter.foreignKeys(Collection.Collection, [{ source: GOOGLE_INTEGRATION_SOURCE, id: remoteId }])),
    ).run;
    if (existing.length > 0) {
      return existing[0];
    }
    const collection = Collection.make({
      [Obj.Meta]: { keys: [{ source: GOOGLE_INTEGRATION_SOURCE, id: remoteId }] },
      name,
    });
    return yield* Database.add(collection);
  });
