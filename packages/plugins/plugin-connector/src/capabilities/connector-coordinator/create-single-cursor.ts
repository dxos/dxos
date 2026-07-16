//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';

import { Connection, type ConnectorEntry } from '#types';

/**
 * Create exactly one binding for a single-target connector (no `getSyncTargets`):
 * bind a supplied `existingTarget` or materialize a fresh local root. Replaces
 * the old `onTokenCreated`-creates-the-target path (e.g. Gmail's Mailbox).
 */
export const createSingleCursor = (
  invoker: Operation.OperationService,
  db: Database.Database,
  connector: ConnectorEntry,
  connection: Connection.Connection,
  existingTarget: Ref.Ref<Obj.Any> | undefined,
): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    let target: Obj.Unknown | undefined;
    if (existingTarget) {
      target = yield* Database.load(existingTarget);
      const accessToken = yield* Database.load(connection.accessToken);
      const name = accessToken.account;
      if (name) {
        Obj.update(target, (target) => Obj.setLabel(target, name));
      }
    } else if (connector.materializeTarget) {
      const { target: materialized } = yield* invoker.invoke(
        connector.materializeTarget,
        { connection: Ref.make(connection) },
        { spaceId: db.spaceId },
      );
      target = yield* Database.load(materialized);
    }
    if (!target) {
      log.warn('single-target connector cannot create a binding', { connectorId: connection.connectorId });
      return;
    }
    const cursor = yield* Database.add(
      Cursor.makeExternal({ source: connection.accessToken, target: Ref.make(target) }),
    );
    invariant(Cursor.isExternal(cursor));
    // Sets up recurring background sync for the target, if the connector declares it. Its own
    // failure is not special-cased — a defect here is caught by this function's own outer
    // `catchAllDefect` below, same as any other step in this flow.
    yield* connector.onCursorCreated?.({ connection, cursor, target, db }) ?? Effect.void;
  }).pipe(
    Effect.provide(Database.layer(db)),
    Effect.catchAll((error) => Effect.sync(() => log.warn('create single binding failed', { error }))),
    Effect.catchAllDefect((defect) => Effect.sync(() => log.warn('create single binding defect', { defect }))),
  );
