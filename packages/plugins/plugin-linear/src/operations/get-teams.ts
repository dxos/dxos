//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { LinearApi } from '../services';
import { LinearOperation } from '../types';

/**
 * Discovery only — list Linear teams reachable from the integration's token.
 * Read-only: NO local objects are created here. Materialization happens
 * lazily in `SyncLinearTeams` on first sync of a target.
 *
 * Output is sorted by `key` (case-insensitive) so the picker is stable
 * regardless of Linear's response order.
 */
const handler: Operation.WithHandler<typeof LinearOperation.GetLinearTeams> = LinearOperation.GetLinearTeams.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration }) {
      // TODO(wittjosiah): Mirror the Trello pattern — derive the db from the input ref's
      //   target until the OperationInvoker has a `databaseResolver` and the operation
      //   can declare `services: [Database.Service]` directly.
      const target = integration.target;
      const db = target ? Obj.getDatabase(target) : undefined;
      if (!db) {
        return yield* Effect.dieMessage('No database for integration ref.');
      }

      return yield* Effect.gen(function* () {
        const remoteTeams = yield* LinearApi.fetchTeams();
        const sorted = [...remoteTeams].sort((left, right) =>
          left.key.toLowerCase().localeCompare(right.key.toLowerCase()),
        );
        const targets = sorted.map((team) => ({
          id: team.id,
          name: `${team.key} · ${team.name}`,
          description: team.description ?? undefined,
        }));
        return { targets };
      }).pipe(
        Effect.provide(Database.layer(db)),
        Effect.provide(LinearApi.LinearCredentials.fromIntegration(integration)),
      );
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
