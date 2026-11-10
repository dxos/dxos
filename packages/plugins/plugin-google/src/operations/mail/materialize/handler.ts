//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { Connection } from '@dxos/link';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';

import { GoogleOperation } from '#types';

import { databaseOf } from '../../database-of.ts';

/**
 * Eagerly materializes a local Mailbox so the sync cursor's target exists before the cursor is
 * created. Gmail is a single-target connector with no remote selection, so a fresh Mailbox is always
 * created; the connection's `accessToken.account` (the authenticated email) seeds the default name
 * when available.
 */
const handler: Operation.WithHandler<typeof GoogleOperation.MaterializeGmailTarget> =
  GoogleOperation.MaterializeGmailTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection }) {
        // TODO(wittjosiah): the operation should just depend on `Database.Service` and
        //   have it provided by the OperationInvoker — composer's invoker is wired
        //   without a `databaseResolver`, so we derive the db from the connection ref's
        //   target and provide `Database.layer(db)` ourselves.
        const db = yield* databaseOf(connection);

        return yield* Effect.gen(function* () {
          const connectionObj = yield* Database.load(connection);
          const accessToken = yield* Database.load(Connection.getAccessToken(connectionObj));
          const name = accessToken.account ?? 'Inbox';
          const created = yield* Database.add(Mailbox.make({ name }));
          return { target: Ref.make(created) };
        }).pipe(Effect.provide(Database.layer(db)));
      }),
    ),
  );

export default handler;
