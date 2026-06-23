//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Channel } from '@dxos/types';

import { DISCORD_SOURCE } from '../constants';
import { DiscordOperation } from '../types';
import { findChannelForDiscordChannel } from './sync';

/**
 * Find-or-create the empty local root for a Discord channel: a feed-backed
 * `Channel` keyed by the Discord channel id. Idempotent — re-running on the
 * same `(space, channel)` returns the same Channel.
 *
 * Materialization is eager (binding creation), so the Channel exists before
 * the first sync; `sync` only appends messages to its feed.
 */
const handler: Operation.WithHandler<typeof DiscordOperation.MaterializeDiscordTarget> =
  DiscordOperation.MaterializeDiscordTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection, remoteTarget }) {
        invariant(remoteTarget, 'Discord is a multi-target connector; remoteTarget is required.');
        // TODO(wittjosiah): the operation should just depend on `Database.Service` and
        //   have it provided by the OperationInvoker — composer's invoker is wired
        //   without a `databaseResolver`, so we derive the db from the connection ref's
        //   target and provide `Database.layer(db)` ourselves.
        const db = connection.target ? Obj.getDatabase(connection.target) : undefined;
        if (!db) {
          return yield* Effect.fail(new SyncDatabaseMissingError());
        }

        return yield* Effect.gen(function* () {
          const existing = yield* findChannelForDiscordChannel(remoteTarget.id);
          if (existing) {
            return { target: Ref.make(existing) };
          }
          const channel = Channel.make({
            [Obj.Meta]: { keys: [{ source: DISCORD_SOURCE, id: remoteTarget.id }] },
            name: remoteTarget.name,
          });
          const created = yield* Database.add(channel);
          return { target: Ref.make(created) };
        }).pipe(Effect.provide(Database.layer(db)));
      }),
    ),
  );

export default handler;
