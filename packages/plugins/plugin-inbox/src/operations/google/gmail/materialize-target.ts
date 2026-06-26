//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';

import { InboxOperation, Mailbox } from '../../../types';

/**
 * Eagerly materializes a local Mailbox so a {@link SyncBinding} can be created
 * (relations require both endpoints to exist). Gmail is a single-target connector
 * with no remote selection. When `existingTarget` is supplied, its name is updated
 * to match the account email rather than creating a fresh Mailbox.
 */
const handler: Operation.WithHandler<typeof InboxOperation.MaterializeGmailTarget> =
  InboxOperation.MaterializeGmailTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection, existingTarget }) {
        // TODO(wittjosiah): the operation should just depend on `Database.Service` and
        //   have it provided by the OperationInvoker — composer's invoker is wired
        //   without a `databaseResolver`, so we derive the db from the connection ref's
        //   target and provide `Database.layer(db)` ourselves.
        const connectionObj = connection.target;
        const db = connectionObj ? Obj.getDatabase(connectionObj) : undefined;
        if (!connectionObj || !db) {
          return yield* Effect.fail(new SyncDatabaseMissingError());
        }

        return yield* Effect.gen(function* () {
          const accessToken = yield* Database.load(connectionObj.accessToken);
          const name = accessToken.account ?? 'Inbox';

          if (existingTarget) {
            const mailbox = yield* Database.load(existingTarget);
            if (Mailbox.instanceOf(mailbox) && mailbox.name !== name) {
              Obj.update(mailbox, (m) => {
                m.name = name;
              });
            }
            return { target: existingTarget };
          }

          const created = yield* Database.add(Mailbox.make({ name }));
          return { target: Ref.make(created) };
        }).pipe(Effect.provide(Database.layer(db)));
      }),
    ),
  );

export default handler;
