//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { type Operation } from '@dxos/compute';
import { Database, Filter, Obj } from '@dxos/echo';

import { ConnectionSyncError } from '../errors';
import { Connection, Connector } from '../types';
import { findBindingForTarget } from './find-binding';
import { syncBinding } from './sync-binding';

/**
 * Syncs a single sync target (a Mailbox, Calendar, …) by way of its binding: a plain Effect rather
 * than a registered Operation, since it only resolves which binding and connector the target belongs
 * to and hands off to {@link syncBinding}. No-op for an object that is not bound to a connection.
 */
export const syncTarget = (
  target: Obj.Unknown,
): Effect.Effect<void, ConnectionSyncError, Capability.Service | Operation.Service> =>
  Effect.gen(function* () {
    const db = Obj.getDatabase(target);
    if (!db) {
      return;
    }

    yield* Effect.gen(function* () {
      const cursor = yield* findBindingForTarget(target);
      if (!cursor) {
        return;
      }

      const [connection] = yield* Database.query(
        Filter.type(Connection.Connection, { accessToken: cursor.spec.source }),
      ).run;
      const connectors = (yield* Capability.getAll(Connector)).flat();
      const connector = connectors.find((entry) => entry.id === connection?.connectorId);
      if (!connector) {
        return;
      }

      yield* syncBinding({ connector, cursor, spaceId: db.spaceId });
    }).pipe(
      Effect.provide(Database.layer(db)),
      // Resolving the binding and its connector can fail the same way the sync itself can, so the
      // caller sees one error type either way.
      Effect.mapError((error) =>
        error instanceof ConnectionSyncError ? error : new ConnectionSyncError({ cause: error }),
      ),
    );
  });
