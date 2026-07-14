//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';

import { type Connection, type ConnectorEntry } from '../types';
import { isCursorForConnection } from './cursor-queries';

/** A user-chosen remote target to bind. */
export type SyncTargetSelection = { externalId: string; name?: string };

export type ReconcileCursorsInput = {
  /** Resolves the connector's `materializeTarget` operation against the connection's space. */
  invoker: Operation.OperationService;
  /** Live database the cursors are reconciled in. */
  db: Database.Database;
  connection: Connection.Connection;
  connector: ConnectorEntry;
  selected: ReadonlyArray<SyncTargetSelection>;
  /** Bind this pre-existing object as the first newly-selected target instead of materializing one. */
  existingTarget?: Ref.Ref<Obj.Unknown>;
};

/**
 * Reconcile a connection's external-sync {@link Cursor} objects against the chosen remote targets:
 * remove deselected cursors (the synced object is left in place), and create one cursor per
 * newly-selected target — binding `existingTarget` for the first new selection, otherwise
 * materializing a fresh local root via `connector.materializeTarget`. A connector with no
 * `materializeTarget` (no dedicated local root type, e.g. Google Contacts) binds the connection
 * itself as the target; its synced objects land directly in the space keyed by foreign id. Returns
 * add/remove counts.
 *
 * Runs within a {@link Database} context (provide `Database.layer(db)`); the HTTP client
 * `materializeTarget` needs is provided internally.
 */
export const reconcileCursors = ({
  invoker,
  db,
  connection,
  connector,
  selected,
  existingTarget,
}: ReconcileCursorsInput) =>
  Effect.gen(function* () {
    const existingCursors = (yield* Database.query(Filter.type(Cursor.Cursor)).run).filter(
      (cursor): cursor is Cursor.ExternalCursor => isCursorForConnection(cursor, connection),
    );
    const existingByRemote = new Map<string, Cursor.ExternalCursor>();
    for (const cursor of existingCursors) {
      if (cursor.spec.externalId !== undefined) {
        existingByRemote.set(cursor.spec.externalId, cursor);
      }
    }
    const selectedIds = new Set(selected.map((sel) => sel.externalId));

    let added = 0;
    let removed = 0;

    // Remove deselected cursors (leave the synced object in place).
    for (const cursor of existingCursors) {
      if (cursor.spec.externalId !== undefined && !selectedIds.has(cursor.spec.externalId)) {
        yield* Database.remove(cursor);
        removed++;
      }
    }

    // The first newly-selected target binds the supplied `existingTarget`
    // (init-from-object flow); the rest materialize fresh local roots.
    const firstNew = existingTarget ? selected.find((sel) => !existingByRemote.has(sel.externalId)) : undefined;
    for (const sel of selected) {
      if (existingByRemote.has(sel.externalId)) {
        continue;
      }
      let target: Obj.Unknown;
      if (sel === firstNew && existingTarget) {
        target = yield* Database.load(existingTarget);
        if (sel.name) {
          Obj.update(target, (target) => Obj.setLabel(target, sel.name!));
        }
      } else if (connector.materializeTarget) {
        const { target: materialized } = yield* invoker.invoke(
          connector.materializeTarget,
          {
            connection: Ref.make(connection),
            remoteTarget: { id: sel.externalId, name: sel.name ?? sel.externalId },
          },
          { spaceId: db.spaceId },
        );
        target = yield* Database.load(materialized);
      } else {
        // Targetless connector: no dedicated local root object, so the cursor's target is the
        // connection itself. The remote target is identified by `externalId`; synced objects land
        // directly in the space.
        // TODO(wittjosiah): Verify whether a self-referencing cursor (target === the connection) is
        //   a good pattern or an anti-pattern; consider a dedicated marker/null target instead.
        target = connection;
      }
      yield* Database.add(
        Cursor.makeExternal({
          source: connection.accessToken,
          target: Ref.make(target),
          externalId: sel.externalId,
          ...(sel.name ? { label: sel.name } : {}),
        }),
      );
      added++;
    }

    return { added, removed };
  });
