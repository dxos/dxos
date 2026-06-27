//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';

import { InboxOperation, Mailbox } from '../../../types';

/**
 * Eagerly materializes a local Mailbox so a {@link SyncBinding} can be created (relations require
 * both endpoints to exist). JMAP is a single-target connector (the account inbox), so a fresh
 * Mailbox is always created; the connection's `accessToken.account` seeds the default name. Mirrors
 * the Gmail materialize-target.
 */
const handler: Operation.WithHandler<typeof InboxOperation.MaterializeJmapTarget> =
  InboxOperation.MaterializeJmapTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection }) {
        // The operation derives the db from the connection ref's target and provides
        // `Database.layer(db)` itself (composer's invoker is wired without a `databaseResolver`).
        const connectionObj = connection.target;
        const db = connectionObj ? Obj.getDatabase(connectionObj) : undefined;
        if (!connectionObj || !db) {
          return yield* Effect.fail(new SyncDatabaseMissingError());
        }

        return yield* Effect.gen(function* () {
          const accessToken = yield* Database.load(connectionObj.accessToken);
          const name = accessToken.account ?? 'Inbox';
          const created = yield* Database.add(Mailbox.make({ name }));
          return { target: Ref.make(created) };
        }).pipe(Effect.provide(Database.layer(db)));
      }),
    ),
  );

export default handler;
