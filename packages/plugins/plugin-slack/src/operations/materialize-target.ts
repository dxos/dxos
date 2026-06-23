//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { IntegrationDatabaseMissingError } from '../errors';
import { SlackOperation } from '../types';
import { findOrCreateChannelForTarget } from './sync';

/**
 * Find-or-create the empty local Channel root for a Slack conversation so a
 * {@link SyncBinding} relation can be created eagerly (relations require both
 * endpoints to exist). Idempotent: keyed by the conversation's `remoteId`
 * foreign key, it returns the existing Channel when one already carries that
 * key. Slack is a multi-target connector, so `remoteTarget` is always supplied.
 */
const handler: Operation.WithHandler<typeof SlackOperation.MaterializeSlackTarget> =
  SlackOperation.MaterializeSlackTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection, remoteTarget }) {
        invariant(remoteTarget, 'Slack is a multi-target connector; remoteTarget is required.');
        // TODO(wittjosiah): the operation should just depend on `Database.Service` and
        //   have it provided by the OperationInvoker — composer's invoker is wired
        //   without a `databaseResolver`, so we derive the db from the connection ref's
        //   target and provide `Database.layer(db)` ourselves.
        const db = connection.target ? Obj.getDatabase(connection.target) : undefined;
        if (!db) {
          return yield* Effect.fail(new IntegrationDatabaseMissingError());
        }

        return yield* Effect.gen(function* () {
          const channel = yield* findOrCreateChannelForTarget({ remoteId: remoteTarget.id, name: remoteTarget.name });
          return { target: Ref.make(channel) };
        }).pipe(Effect.provide(Database.layer(db)));
      }),
    ),
  );

export default handler;
