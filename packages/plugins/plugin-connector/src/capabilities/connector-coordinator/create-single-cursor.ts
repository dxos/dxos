//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';

import * as ConnectorSpec from '../../types/ConnectorSpec';
import { findSyncTriggerForBinding, findSyncTriggerForConnection } from '../../util';

/** Outcome of binding a single-target connector. */
export type SingleCursorResult = {
  cursor: Cursor.ExternalCursor;
  target: Obj.Unknown;
  /**
   * The connector declares a recurring sync trigger and the target has no sync routine yet — the
   * caller offers one through the create-routine form (nothing is persisted here; see
   * `openCreateSyncRoutineDialog`).
   */
  needsSyncRoutine: boolean;
};

/**
 * Create exactly one binding for a single-target connector (no `getSyncTargets`):
 * bind a supplied `existingTarget` or materialize a fresh local root. Replaces
 * the old `onTokenCreated`-creates-the-target path (e.g. Gmail's Mailbox).
 *
 * The recurring sync routine is NOT created here — the caller surfaces it through the seeded
 * create-routine form so the user sees (and can edit) what is being created, instead of it being
 * persisted silently in the background.
 */
export const createSingleCursor = (
  invoker: Operation.OperationService,
  db: Database.Database,
  connector: ConnectorSpec.ConnectorEntry,
  connection: Connection.Connection,
  existingTarget: Ref.Ref<Obj.Any> | undefined,
): Effect.Effect<SingleCursorResult | undefined, never> =>
  Effect.gen(function* () {
    let target: Obj.Unknown | undefined;
    if (existingTarget) {
      target = yield* Database.load(existingTarget);
      const accessToken = yield* Database.load(connection.accessToken);
      const name = accessToken.account;
      if (name) {
        Obj.update(target, (target) => Obj.setLabel(target, name));
      }
    } else if (connector.sync?.materializeTarget) {
      const { target: materialized } = yield* invoker.invoke(
        connector.sync.materializeTarget,
        { connection: Ref.make(connection) },
        { spaceId: db.spaceId },
      );
      target = yield* Database.load(materialized);
    }
    if (!target) {
      log.warn('single-target connector cannot create a binding', { connectorId: connection.connectorId });
      return undefined;
    }
    const cursor = yield* Database.add(
      Cursor.makeExternal({ source: connection.accessToken, target: Ref.make(target) }),
    );
    invariant(Cursor.isExternal(cursor));
    log.info('bound single-target connector', {
      connectorId: connection.connectorId,
      target: target.id,
      bound: existingTarget ? 'existing' : 'materialized',
    });
    const needsSyncRoutine = !!connector.sync?.trigger && !(yield* hasSyncRoutine(connection, cursor));
    // Flush the index so a caller that queries cursors right after (e.g. the mailbox/calendar
    // article this navigates to, or the sync template's scaffold) observes the new binding
    // immediately, matching `reconcileCursors`.
    yield* Database.flush({ indexes: true });
    return { cursor, target, needsSyncRoutine };
  }).pipe(
    Effect.provide(Database.layer(db)),
    Effect.catch((error) =>
      Effect.sync(() => {
        log.warn('create single binding failed', { error });
        return undefined;
      }),
    ),
    Effect.catchDefect((defect) =>
      Effect.sync(() => {
        log.warn('create single binding defect', { defect });
        return undefined;
      }),
    ),
  );

/** Whether a sync routine already covers this binding: the connection's account-level trigger, or a legacy per-binding one. */
const hasSyncRoutine = (
  connection: Connection.Connection,
  cursor: Cursor.ExternalCursor,
): Effect.Effect<boolean, never, Database.Service> =>
  Effect.gen(function* () {
    const connectionTrigger = yield* findSyncTriggerForConnection(connection);
    if (connectionTrigger) {
      return true;
    }
    const legacyTrigger = yield* findSyncTriggerForBinding(cursor);
    return !!legacyTrigger;
  }).pipe(Effect.orDie);
