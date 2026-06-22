//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Database, Filter, type Obj, Query, type Ref, Relation } from '@dxos/echo';

import { type Connection, type ConnectorEntry, SyncBinding } from '../types';

/** A user-chosen remote target to bind. */
export type SyncTargetSelection = { remoteId: string; name?: string };

export type ReconcileSyncBindingsInput = {
  /** Live database; forwarded to `connector.materializeTarget`. */
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
 * local root via `connector.materializeTarget`. Returns add/remove counts.
 *
 * Runs within a {@link Database} context (provide `Database.layer(db)`); the
 * HTTP client `materializeTarget` needs is provided internally.
 */
export const reconcileSyncBindings = ({ db, connection, connector, selected, existingTarget }: ReconcileSyncBindingsInput) =>
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
      let target: Obj.Unknown | undefined;
      if (sel === firstNew && existingTarget) {
        target = yield* Database.load(existingTarget);
      } else if (connector.materializeTarget) {
        target = yield* connector
          .materializeTarget({
            connection,
            db,
            remoteTarget: { id: sel.remoteId, name: sel.name ?? sel.remoteId },
          })
          .pipe(Effect.provide(FetchHttpClient.layer));
      }
      if (!target) {
        continue;
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
