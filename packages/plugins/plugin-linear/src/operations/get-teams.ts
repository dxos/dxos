//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { IntegrationDatabaseMissingError } from '../errors';
import { LinearApi } from '../services';
import { GetLinearTeams } from './definitions';

/**
 * Discovery only — list Linear teams reachable from the integration's token.
 * Read-only: NO local objects are created here. Materialization happens
 * lazily in `SyncLinearTeam` on first sync of a target.
 */
const handler: Operation.WithHandler<typeof GetLinearTeams> = GetLinearTeams.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration }) {
      const target = integration.target;
      const db = target ? Obj.getDatabase(target) : undefined;
      if (!db) {
        return yield* Effect.fail(new IntegrationDatabaseMissingError());
      }

      return yield* Effect.gen(function* () {
        const remoteTeams = yield* LinearApi.fetchTeams();
        const targets = remoteTeams.map((team) => ({
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
