//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { type Connection, SyncBinding } from '@dxos/types';

import { type ConnectorEntry } from '../types';

/** A user-chosen remote target to bind. */
export type SyncTargetSelection = { remoteId: string; name?: string };

export type ReconcileSyncBindingsInput = {
  /** Resolves the connector's `materializeTarget` operation against the connection's space. */
  invoker: Operation.OperationService;
  /** Live database the bindings are reconciled in. */
  db: Database.Database;
  connection: Connection.Connection;
  connector: ConnectorEntry;
  selected: ReadonlyArray<SyncTargetSelection>;
  /** Bind this pre-existing object as the first newly-selected target instead of materializing one. */
  existingTarget?: Ref.Ref<Obj.Unknown>;
};

/**
 * Reconcile a connection's {@link SyncBinding} relations against the chosen
 * remote targets: remove deselected bindings (the synced object is left in
 * place), and create one binding per newly-selected target — binding
 * `existingTarget` for the first new selection, otherwise materializing a fresh
 * local root via `connector.materializeTarget`. A connector with no
 * `materializeTarget` (no dedicated local root type, e.g. Google Contacts) binds
 * the connection itself as the target; its synced objects land directly in the
 * space keyed by foreign id. Returns add/remove counts.
 *
 * Runs within a {@link Database} context (provide `Database.layer(db)`); the
 * HTTP client `materializeTarget` needs is provided internally.
 */
export const reconcileSyncBindings = ({
  invoker,
  db,
  connection,
  connector,
  selected,
  existingTarget,
}: ReconcileSyncBindingsInput) =>
  Effect.gen(function* () {
    const existingBindings = yield* Database.query(
      Query.select(Filter.id(connection.id)).sourceOf(SyncBinding.SyncBinding),
    ).run;
    const existingByRemote = new Map<string, SyncBinding.SyncBinding>();
    for (const binding of existingBindings) {
      if (binding.remoteId !== undefined) {
        existingByRemote.set(binding.remoteId, binding);
      }
    }
    const selectedIds = new Set(selected.map((sel) => sel.remoteId));

    let added = 0;
    let removed = 0;

    // Remove deselected bindings (leave the synced object in place).
    for (const binding of existingBindings) {
      if (binding.remoteId !== undefined && !selectedIds.has(binding.remoteId)) {
        yield* Database.remove(binding);
        removed++;
      }
    }

    // The first newly-selected target binds the supplied `existingTarget`
    // (init-from-object flow); the rest materialize fresh local roots.
    const firstNew = existingTarget ? selected.find((sel) => !existingByRemote.has(sel.remoteId)) : undefined;
    for (const sel of selected) {
      if (existingByRemote.has(sel.remoteId)) {
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
            remoteTarget: { id: sel.remoteId, name: sel.name ?? sel.remoteId },
          },
          { spaceId: db.spaceId },
        );
        target = yield* Database.load(materialized);
      } else {
        // Targetless connector: no dedicated local root object, so the binding
        // is a self-loop referencing the connection. The remote target is
        // identified by `remoteId`; synced objects land directly in the space.
        // TODO(wittjosiah): Verify whether a self-loop SyncBinding (source === target)
        //   is a good pattern or an anti-pattern; consider a dedicated marker/null target instead.
        target = connection;
      }
      yield* Database.add(
        SyncBinding.make({
          [Relation.Source]: connection,
          [Relation.Target]: target,
          remoteId: sel.remoteId,
          ...(sel.name ? { name: sel.name } : {}),
        }),
      );
      added++;
    }

    return { added, removed };
  });
