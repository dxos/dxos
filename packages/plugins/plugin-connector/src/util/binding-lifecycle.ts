//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Filter, Obj, Query, type Ref } from '@dxos/echo';
import { type AccessToken, type Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';

import { TargetAccountMismatchError } from '../errors';
import { meta } from '../meta';
import * as ConnectorSpec from '../types/ConnectorSpec';
import { isCursorForConnection } from './cursor-predicates';
import { findOrphanedBindingsForTarget } from './find-binding';
import { ensureSyncTrigger } from './sync-routine';
import { setSyncTriggerEnabled } from './sync-trigger';
import { checkTargetAccount, recordTargetAccount } from './target-account';

/**
 * Suspends a connection's bindings ahead of deleting it: their sync triggers are disabled, the cursors
 * themselves left in place. A cursor's progress (synced range, merge snapshots, delta token) describes
 * the remote account, not the credential, so discarding it on every disconnect would force the next
 * connect to re-walk the whole horizon — and since dedup outside the feed's seeded boundary windows
 * relies on that range, a re-walk of a large target re-appends its middle. Returns how many were
 * suspended. Every surface reads such a binding as unbound (see `findLiveBinding`), so the target
 * offers Connect again while the state waits for it.
 */
export const suspendConnectionBindings = (
  connection: Connection.Connection,
): Effect.Effect<number, never, Database.Service> =>
  Effect.gen(function* () {
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    const bindings = cursors.filter((cursor): cursor is Cursor.ExternalCursor =>
      isCursorForConnection(cursor, connection),
    );
    for (const binding of bindings) {
      yield* setSyncTriggerEnabled(binding, false);
    }
    if (bindings.length > 0) {
      log.info('suspended bindings of deleted connection', {
        connectorId: connection.connectorId,
        bindings: bindings.length,
      });
    }
    return bindings.length;
  });

/**
 * Removes a dormant binding and the sync Routine driving it. The Routine owns its trigger, so removing
 * it takes the trigger too; leaving either behind would keep a schedule pointed at a cursor that is
 * gone, and would shadow the target's new Routine (a sync Routine is matched to its target *through*
 * the cursor).
 */
export const removeBinding = (cursor: Cursor.ExternalCursor): Effect.Effect<void, never, Database.Service> =>
  Effect.gen(function* () {
    const routines = yield* Database.query(
      Query.select(Filter.id(cursor.id)).referencedBy(Trigger.Trigger).referencedBy(Routine.Routine, 'triggers'),
    ).run;
    for (const routine of routines) {
      yield* Database.remove(routine);
    }
    yield* Database.remove(cursor);
  });

export type PrepareTargetBindingOptions = {
  /** Object being bound (Mailbox, Calendar, …). */
  target: Obj.Unknown;
  /** Credential the connection authenticates with; its `source` keys the target's account record. */
  accessToken: AccessToken.AccessToken;
  /** Reference to the same credential, written onto a resumed cursor. */
  source: Ref.Ref<AccessToken.AccessToken>;
  /** Remote target id, when the connector binds several (calendars, boards); must also match to resume. */
  externalId?: string;
  /** Connector being bound, used to restore a resumed binding's sync Routine. */
  connector?: ConnectorSpec.ConnectorEntry;
};

/**
 * Settles what a target's existing state means for a new binding, and records the account it is now
 * synced from. Returns the cursor the caller should use, or `undefined` when it should create a fresh
 * one. Fails with {@link TargetAccountMismatchError} — before mutating anything — when the target
 * already syncs a different account.
 *
 * Resuming is gated on the account rather than on the target alone because the cursor is a resume
 * position, not just an association: `max` is a provider timestamp, so inheriting another account's
 * watermark would leave every message older than it unfetched, silently.
 */
export const prepareTargetBinding = ({
  target,
  accessToken,
  source,
  externalId,
  connector,
}: PrepareTargetBindingOptions): Effect.Effect<
  Cursor.ExternalCursor | undefined,
  TargetAccountMismatchError,
  Database.Service
> =>
  Effect.gen(function* () {
    const account = accessToken.account;
    const check = checkTargetAccount(target, accessToken.source, account);
    if (check === 'mismatch') {
      return yield* Effect.fail(
        new TargetAccountMismatchError({
          targetId: target.id,
          expected: readRecorded(target, accessToken.source),
          actual: account!,
        }),
      );
    }

    const orphaned = yield* findOrphanedBindingsForTarget(target);
    // Only a confirmed account may inherit progress; an unrecorded one starts over.
    const adopted =
      check === 'match'
        ? orphaned.find(
            (cursor) =>
              externalId === undefined || cursor.spec.externalId === undefined || cursor.spec.externalId === externalId,
          )
        : undefined;
    for (const cursor of orphaned) {
      if (cursor !== adopted) {
        yield* removeBinding(cursor);
      }
    }

    if (account !== undefined) {
      recordTargetAccount(target, accessToken.source, account);
    }
    if (!adopted) {
      return undefined;
    }

    Cursor.rebindSource(adopted, source);
    // Restores the schedule suspended at disconnect; creates one if the connector gained a trigger spec
    // (or the Routine was removed) while the binding lay dormant.
    if (connector) {
      yield* ensureSyncTrigger({ connector, cursor: adopted });
      yield* setSyncTriggerEnabled(adopted, true);
    }
    log.info('resumed dormant binding', { account, target: target.id, max: adopted.max });
    return adopted;
  });

/** The account a target is recorded as syncing; only called where a mismatch proved one exists. */
const readRecorded = (target: Obj.Unknown, source: string): string => Obj.getKeys(target, source)[0]!.id;

/**
 * Tells the user why a completed sign-in bound nothing. The credential is real and the connection is
 * kept — only the binding is refused — so without this the flow looks like it simply did nothing. The
 * accounts themselves are not named: a `Label` carries no interpolation params, and the log has them.
 */
export const reportTargetAccountMismatch = (invoker: Operation.OperationService): Effect.Effect<void, never> =>
  Effect.ignore(
    invoker.invoke(LayoutOperation.AddToast, {
      id: `${meta.profile.key}.account-mismatch`,
      icon: 'ph--warning--regular',
      title: ['account-mismatch.title', { ns: meta.profile.key }],
      description: ['account-mismatch.description', { ns: meta.profile.key }],
    }),
  );

/** True for the error {@link prepareTargetBinding} fails with, for callers that skip or report it. */
export const isTargetAccountMismatch = (error: unknown): error is TargetAccountMismatchError =>
  error instanceof TargetAccountMismatchError;
