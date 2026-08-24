//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';

import { ConnectorSpec } from '#types';

import * as Binding from '../../Binding';

/** Outcome of binding a single-target connector. */
export type SingleCursorResult = {
  cursor: Cursor.ExternalCursor;
  target: Obj.Unknown;
  /**
   * The connector declares a recurring sync trigger and the connection has no sync routine yet — the
   * caller offers one through the create-routine form (nothing is persisted here; see
   * `openCreateSyncRoutineDialog`).
   */
  needsSyncRoutine: boolean;
};

/**
 * Create exactly one binding for a single-target connector (no `getSyncTargets`): bind a supplied
 * `existingTarget` or materialize a fresh local root. The sync routine stays with the caller's
 * create-routine form, so nothing is persisted without the user seeing it.
 */
export const createSingleCursor = (
  invoker: Operation.OperationService,
  db: Database.Database,
  connector: ConnectorSpec.ConnectorEntry,
  connection: Connection.Connection,
  existingTarget: Ref.Ref<Obj.Any> | undefined,
): Effect.Effect<SingleCursorResult | undefined, never> =>
  Effect.gen(function* () {
    const accessToken = yield* Database.load(connection.accessToken);
    const account = accessToken.account;
    let target: Obj.Unknown | undefined;
    if (existingTarget) {
      target = yield* Database.load(existingTarget);
      // The account is only known once the sign-in completes, so this is where a user who authorized the
      // wrong account finds out. The connection stays (the credential is real); the binding is refused.
      if (Binding.checkAccount(target, accessToken.source, account) === 'mismatch') {
        log.warn('refusing to bind: target syncs another account', {
          target: target.id,
          recorded: Binding.readAccount(target, accessToken.source),
          account,
        });
        yield* Binding.reportAccountMismatch.pipe(Effect.provideService(Operation.Service, invoker));
        return undefined;
      }
      if (account) {
        Obj.update(target, (target) => Obj.setLabel(target, account));
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
    // A target the user is re-connecting may hold the dormant binding of an earlier connection; resuming
    // it keeps the synced range so the sync picks up where it left off.
    const adopted = yield* Binding.prepare({
      target,
      accessToken,
      source: connection.accessToken,
    });
    const cursor =
      adopted ??
      (yield* Database.add(Cursor.makeExternal({ source: connection.accessToken, target: Ref.make(target) })));
    invariant(Cursor.isExternal(cursor));
    log.info('bound single-target connector', {
      connectorId: connection.connectorId,
      target: target.id,
      bound: existingTarget ? 'existing' : 'materialized',
      resumed: adopted !== undefined,
    });
    const needsSyncRoutine = !!connector.sync?.trigger && !(yield* Binding.findTrigger(connection));
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
