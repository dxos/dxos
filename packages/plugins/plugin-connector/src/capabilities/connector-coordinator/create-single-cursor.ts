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
import {
  checkTargetAccount,
  ensureSyncTrigger,
  prepareTargetBinding,
  readTargetAccount,
  reportTargetAccountMismatch,
} from '../../util';

/**
 * Create exactly one binding for a single-target connector (no `getSyncTargets`):
 * bind a supplied `existingTarget` or materialize a fresh local root. Replaces
 * the old `onTokenCreated`-creates-the-target path (e.g. Gmail's Mailbox).
 */
export const createSingleCursor = (
  invoker: Operation.OperationService,
  db: Database.Database,
  connector: ConnectorSpec.ConnectorEntry,
  connection: Connection.Connection,
  existingTarget: Ref.Ref<Obj.Any> | undefined,
): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    const accessToken = yield* Database.load(connection.accessToken);
    const account = accessToken.account;
    let target: Obj.Unknown | undefined;
    if (existingTarget) {
      target = yield* Database.load(existingTarget);
      // The account is only known once the sign-in completes, so this is where a user who authorized the
      // wrong account finds out. The connection stays (the credential is real); the binding is refused.
      if (checkTargetAccount(target, accessToken.source, account) === 'mismatch') {
        log.warn('refusing to bind: target syncs another account', {
          target: target.id,
          recorded: readTargetAccount(target, accessToken.source),
          account,
        });
        return yield* reportTargetAccountMismatch(invoker);
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
      return;
    }
    // A target the user is re-connecting may hold the dormant binding of an earlier connection; resuming
    // it keeps the synced range so the sync picks up where it left off.
    const adopted = yield* prepareTargetBinding({
      target,
      accessToken,
      source: connection.accessToken,
      connector,
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
    // Sets up recurring background sync for the binding, if the connector declares a trigger spec.
    // Its own failure is not special-cased — a defect here is caught by this function's own outer
    // `catchAllDefect` below, same as any other step in this flow.
    yield* ensureSyncTrigger({ connector, cursor });
    // Flush the index so a caller that queries cursors right after (e.g. the mailbox/calendar
    // article this navigates to) observes the new binding immediately, matching `reconcileCursors`.
    yield* Database.flush({ indexes: true });
  }).pipe(
    Effect.provide(Database.layer(db)),
    Effect.catchAll((error) => Effect.sync(() => log.warn('create single binding failed', { error }))),
    Effect.catchAllDefect((defect) => Effect.sync(() => log.warn('create single binding defect', { defect }))),
  );
