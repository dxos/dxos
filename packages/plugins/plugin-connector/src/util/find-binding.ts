//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, type Obj } from '@dxos/echo';
import { Connection, Cursor } from '@dxos/link';

import { isCursorForConnection, isCursorForTarget } from './cursor-predicates';

/** An object's binding: the external cursor that syncs it, plus the connection authenticating it. */
export type LiveBinding = {
  cursor: Cursor.ExternalCursor;
  connection: Connection.Connection;
};

/**
 * The external-sync {@link Cursor} targeting `target` together with the {@link Connection} whose
 * access token authenticates it, or `undefined` when the target has no such pair.
 *
 * Both halves are required because deleting a connection does not cascade to the cursors referencing
 * its access token, and a target holding such an orphan cannot sync — read as bound it would offer
 * neither Connect (suppressed by the binding) nor Sync (suppressed by the missing connection). Pure
 * over already-read lists so graph extensions and React hooks share one notion of "bound".
 */
export const findLiveBinding = (
  cursors: readonly Cursor.Cursor[],
  connections: readonly Connection.Connection[],
  target: Obj.Unknown,
): LiveBinding | undefined => {
  for (const cursor of cursors) {
    if (!Cursor.isExternal(cursor) || !isCursorForTarget(cursor, target)) {
      continue;
    }
    const connection = connections.find((candidate) => isCursorForConnection(cursor, candidate));
    if (connection) {
      return { cursor, connection };
    }
  }
};

/**
 * {@link findLiveBinding} over the target's whole space.
 *
 * `Cursor` has no reverse-ref index on `spec.target` (it's one level below a discriminated-union
 * struct field, which the typed `Query.referencedBy` key doesn't reach), so this scans every cursor
 * in the space and filters — mirrors this plugin's other cursor lookups.
 */
export const findLiveBindingForTarget = (
  target: Obj.Unknown,
): Effect.Effect<LiveBinding | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
    return findLiveBinding(cursors, connections, target);
  });

/**
 * The external-sync {@link Cursor} whose target is the given object (mailbox, calendar, …), when a
 * connection still backs it. The cursor's `spec.source` is the access token that authenticates sync
 * for that object; credentials and sync re-invocation flow from it.
 */
export const findBindingForTarget = (
  target: Obj.Unknown,
): Effect.Effect<Cursor.ExternalCursor | undefined, never, Database.Service> =>
  findLiveBindingForTarget(target).pipe(Effect.map((binding) => binding?.cursor));

/**
 * External cursors targeting `target` that no {@link Connection} backs — dormant bindings, holding the
 * progress of a sync whose credential was deleted. They are kept rather than discarded (see
 * `adoptOrphanedBinding`): the synced range and merge snapshots they carry are what let a re-bind of the
 * same account resume instead of re-walking the whole horizon.
 */
export const findOrphanedBindings = (
  cursors: readonly Cursor.Cursor[],
  connections: readonly Connection.Connection[],
  target: Obj.Unknown,
): Cursor.ExternalCursor[] =>
  cursors.filter(
    (cursor): cursor is Cursor.ExternalCursor =>
      Cursor.isExternal(cursor) &&
      isCursorForTarget(cursor, target) &&
      !connections.some((connection) => isCursorForConnection(cursor, connection)),
  );

/** {@link findOrphanedBindings} over the target's whole space. */
export const findOrphanedBindingsForTarget = (
  target: Obj.Unknown,
): Effect.Effect<Cursor.ExternalCursor[], never, Database.Service> =>
  Effect.gen(function* () {
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
    return findOrphanedBindings(cursors, connections, target);
  });
