//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Filter, Obj, Query, type Ref } from '@dxos/echo';
import { type AccessToken, type Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';

import * as ConnectorSpec from '../types/ConnectorSpec';
import { isCursorForConnection } from './cursor-predicates';
import { findOrphanedBindingsForTarget } from './find-binding';
import { ensureSyncTrigger } from './sync-routine';
import { setSyncTriggerEnabled } from './sync-trigger';

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

export type AdoptOrphanedBindingOptions = {
  /** Object being bound (Mailbox, Calendar, …). */
  target: Obj.Unknown;
  /** Credential the new connection authenticates with. */
  source: Ref.Ref<AccessToken.AccessToken>;
  /** Remote account of `source`; a binding is only resumed when its own account matches this. */
  account?: string;
  /** Remote target id, when the connector binds several (calendars, boards); must also match. */
  externalId?: string;
  /** Connector being bound, used to restore the binding's sync Routine. */
  connector?: ConnectorSpec.ConnectorEntry;
};

/**
 * Resumes the target's dormant binding for this account, if it has one: the cursor is pointed at the new
 * credential with its progress intact and its sync Routine re-enabled. Dormant bindings for any other
 * account are removed — their watermark describes a different remote mailbox, so resuming from it would
 * silently skip that account's data. Returns the adopted cursor, or `undefined` when the caller should
 * create a fresh binding.
 */
export const adoptOrphanedBinding = ({
  target,
  source,
  account,
  externalId,
  connector,
}: AdoptOrphanedBindingOptions): Effect.Effect<Cursor.ExternalCursor | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const orphaned = yield* findOrphanedBindingsForTarget(target);
    if (orphaned.length === 0) {
      return undefined;
    }

    // An unrecorded account (a cursor written before `spec.account` existed, or a token that never
    // reported one) is not evidence of a match, so those bindings start over rather than resume.
    const adopted = orphaned.find(
      (cursor) =>
        account !== undefined &&
        cursor.spec.account === account &&
        (externalId === undefined || cursor.spec.externalId === undefined || cursor.spec.externalId === externalId),
    );
    for (const cursor of orphaned) {
      if (cursor !== adopted) {
        yield* removeBinding(cursor);
      }
    }
    if (!adopted) {
      return undefined;
    }

    Cursor.rebindSource(adopted, source, account);
    // Restores the schedule suspended at disconnect; creates one if the connector gained a trigger spec
    // (or the Routine was removed) while the binding lay dormant.
    if (connector) {
      yield* ensureSyncTrigger({ connector, cursor: adopted });
      yield* setSyncTriggerEnabled(adopted, true);
    }
    log.info('resumed dormant binding', { account, target: target.id, max: adopted.max });
    return adopted;
  });
