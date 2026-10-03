//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';

import { ConnectorSpec } from '#types';

import * as Binding from '../../Binding.ts';

/** A user-chosen remote target to bind. */
export type SyncTargetSelection = { externalId: string; name?: string };

export type ReconcileCursorsInput = {
  /** Resolves the connector's `materializeTarget` operation against the connection's space. */
  invoker: Operation.OperationService;
  /** Live database the cursors are reconciled in. */
  db: Database.Database;
  connection: Connection.Connection;
  connector: ConnectorSpec.ConnectorEntry;
  selected: ReadonlyArray<SyncTargetSelection>;
  /** Bind this pre-existing object as the first newly-selected target instead of materializing one. */
  existingTarget?: Ref.Ref<Obj.Unknown>;
};

/**
 * Reconcile a connection's external-sync {@link Cursor} objects against the chosen remote targets:
 * remove deselected cursors (the synced object is left in place), and create one cursor per
 * newly-selected target — binding `existingTarget` for the first new selection, otherwise
 * materializing a fresh local root via `connector.sync.materializeTarget`. A connector with no
 * `materializeTarget` (no dedicated local root type, e.g. Google Contacts) binds the connection
 * itself as the target; its synced objects land directly in the space keyed by foreign id. Returns
 * add/remove counts plus the number of cursors bound before this reconciliation, which distinguishes
 * initial setup (none) from a later change of targets.
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
    const accessToken = yield* Database.load(connection.accessToken);
    const account = accessToken.account;
    const existingCursors = (yield* Database.query(Filter.type(Cursor.Cursor)).run).filter(
      (cursor): cursor is Cursor.ExternalCursor => Binding.isForConnection(cursor, connection),
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
        // Refuse a pre-existing target that already syncs another account, leaving the rest of the
        // selection to bind normally into targets of their own.
        if (Binding.checkAccount(target, accessToken.source, account) === 'mismatch') {
          log.warn('refusing to bind: target syncs another account', {
            target: target.id,
            recorded: Binding.readAccount(target, accessToken.source),
            account,
          });
          yield* Binding.reportAccountMismatch.pipe(Effect.provideService(Operation.Service, invoker));
          continue;
        }
        if (sel.name) {
          Obj.update(target, (target) => Obj.setLabel(target, sel.name!));
        }
        // Only a pre-existing target can carry a dormant binding; resuming it keeps the synced range.
        const adopted = yield* Binding.prepare({
          target,
          accessToken,
          source: connection.accessToken,
          externalId: sel.externalId,
        });
        if (adopted) {
          // Resumed with its synced range intact; the account routine's fan-out covers it.
          added++;
          continue;
        }
      } else if (connector.sync?.materializeTarget) {
        const { target: materialized } = yield* invoker.invoke(
          connector.sync.materializeTarget,
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
      const cursor = yield* Database.add(
        Cursor.makeExternal({
          source: connection.accessToken,
          target: Ref.make(target),
          externalId: sel.externalId,
          ...(sel.name ? { label: sel.name } : {}),
        }),
      );
      invariant(Cursor.isExternal(cursor));
      // A materialized target records the account too, so a later re-bind can tell whose data it holds.
      // Skipped for a targetless connector, whose "target" is the connection itself.
      if (account && target !== connection) {
        Binding.recordAccount(target, accessToken.source, account);
      }
      // No sync routine is created here: the connection's single account-level routine covers every
      // binding (its fan-out queries the cursors at run time), and the routine itself is offered
      // through the create-routine form by the caller on initial setup.
      added++;
    }

    // Flush index updates for the adds/removes so a caller that queries cursors right after observes a
    // state consistent with the returned counts (otherwise index lag can still resolve a removed cursor).
    if (added > 0 || removed > 0) {
      yield* Database.flush({ indexes: true });
    }

    return { added, removed, existing: existingCursors.length };
  });
