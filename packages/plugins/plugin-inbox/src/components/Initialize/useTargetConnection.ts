//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { useCallback, useMemo } from 'react';

import { useCapabilities, useSpaceCallback } from '@dxos/app-framework/ui';
import { Trigger, type TriggerEvent } from '@dxos/compute';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { Connection, Connector, type ConnectorEntry, isCursorForTarget } from '@dxos/plugin-connector';
import { connectedRoutinesQuery } from '@dxos/plugin-routine';
import { useQuery } from '@dxos/react-client/echo';

import { createSyncRoutine, findBindingForTarget } from '../../util';

/**
 * Find the {@link Connection} bound to the given `target` object via an external-sync
 * {@link Cursor} (the cursor's `spec.source` access token authenticates sync for that target).
 * Returns the first matching connection (or `undefined` if the target is not yet bound).
 *
 * The cursor no longer relates to `Connection` directly (that coupling was removed), so this scans
 * every cursor in the space, finds the one targeting `target`, then matches its access token against
 * every `Connection` — fuzzy if a token is ever shared across connections.
 */
export const useTargetConnection = <T extends Obj.Any>(
  target: T | undefined,
): { connection: Connection.Connection | undefined } => {
  const db = target ? Obj.getDatabase(target) : undefined;
  const cursors = useQuery(db, Filter.type(Cursor.Cursor));
  const connections = useQuery(db, Filter.type(Connection.Connection));
  const connection = useMemo(() => {
    if (!target) {
      return undefined;
    }
    const cursor = cursors.find(
      (candidate): candidate is Cursor.ExternalCursor =>
        Cursor.isExternal(candidate) && isCursorForTarget(candidate, target),
    );
    if (!cursor) {
      return undefined;
    }
    return connections.find((candidate) => candidate.accessToken.uri === cursor.spec.source.uri);
  }, [target, cursors, connections]);
  return { connection };
};

/**
 * Find `target`'s sync timer trigger: the `timer` trigger owned by a Routine connected to `target`
 * (see {@link connectedRoutinesQuery}), falling back to a bare `timer` trigger whose `input` refs
 * `target` directly (pre-existing triggers not wrapped in a routine).
 */
const useSyncTimerTrigger = <T extends Obj.Any>(
  db: ReturnType<typeof Obj.getDatabase>,
  target: T,
): Trigger.Trigger | undefined => {
  const routines = useQuery(db, connectedRoutinesQuery(target));
  const allTriggers = useQuery(db, Query.select(Filter.type(Trigger.Trigger)));
  const targetUri = Obj.getURI(target);

  return useMemo(() => {
    for (const routine of routines) {
      for (const ref of routine.triggers) {
        if (ref.target?.spec?.kind === 'timer') {
          return ref.target;
        }
      }
    }
    return allTriggers.find((trigger) => {
      if (trigger.spec?.kind !== 'timer') {
        return false;
      }
      const ref = trigger.input?.mailbox ?? trigger.input?.calendar;
      return ref?.uri === targetUri;
    });
  }, [routines, allTriggers, targetUri]);
};

/** The {@link ConnectorEntry} backing `connection`, resolved from the registered {@link Connector} capability list. */
export const useConnectorEntry = (connection: Connection.Connection | undefined): ConnectorEntry | undefined => {
  const connectorEntries = useCapabilities(Connector);
  return useMemo(
    () => connectorEntries.flat().find((entry) => entry.id === connection?.connectorId),
    [connectorEntries, connection],
  );
};

/**
 * Build a `sync` callback for `target`: force-runs its sync timer trigger via
 * {@link Trigger.TriggerMonitorService.invokeTrigger} (edge or local, per the trigger's own `remote`
 * flag — the monitor decides, not this hook) — invoking the trigger *is* how a target syncs, replacing
 * a direct `ConnectorOperation.SyncConnection` call. If `target` has no sync trigger yet (e.g. it was
 * bound before this mechanism existed), creates one first via {@link createSyncRoutine} — the same
 * routine bind-time auto-creation and the properties-panel toggle set up — then invokes it.
 *
 * No in-flight flag: callers that have a live progress monitor for `target` (e.g. `MailboxArticle`'s
 * `syncProgress`) should disable their own "Sync" action while it reports `running`, which already
 * covers a sync kicked off by this callback (the callback itself awaits the run to completion) as well
 * as one started independently by the target's background routine.
 *
 * `connection` exposes whether the target is bound (drives "connect vs. sync").
 *
 * Used by `MailboxArticle` and `CalendarArticle` for their inline "Sync" toolbar action.
 */
export const useTargetSync = <T extends Obj.Any>(
  target: T,
): {
  connection: Connection.Connection | undefined;
  sync: () => Promise<void>;
} => {
  const { connection } = useTargetConnection(target);
  const db = Obj.getDatabase(target);
  const syncTrigger = useSyncTimerTrigger(db, target);
  const connector = useConnectorEntry(connection);

  const ensureAndInvokeSyncTrigger = useSpaceCallback(
    db?.spaceId,
    [Trigger.TriggerMonitorService, Database.Service],
    Effect.fnUntraced(
      function* () {
        const database = yield* Effect.fromNullable(db);
        // Reuse the existing sync trigger; otherwise resolve the connector's `sync` operation and the
        // bound cursor and create one (the same path bind-time auto-creation and the properties-panel
        // toggle use). Any missing value along either path (no db/connector/cursor/creation result)
        // short-circuits via `Effect.fromNullable`'s `NoSuchElementException`, caught below as a no-op.
        const trigger = yield* Option.fromNullable(syncTrigger).pipe(
          Option.match({
            onSome: Effect.succeed,
            onNone: () =>
              Effect.gen(function* () {
                const sync = yield* Effect.fromNullable(connector?.sync);
                const cursor = yield* Effect.fromNullable(yield* findBindingForTarget(target));
                const created = yield* Effect.promise(() => createSyncRoutine({ db: database, target, cursor, sync }));
                return yield* Effect.fromNullable(created);
              }),
          }),
        );
        const monitor = yield* Trigger.TriggerMonitorService;
        yield* monitor.invokeTrigger({ trigger, event: { tick: Date.now() } satisfies TriggerEvent.TimerEvent });
      },
      Effect.catchTag('NoSuchElementException', () => Effect.void),
    ),
    [db, syncTrigger, connector, target],
  );

  const sync = useCallback(async () => {
    if (!connection) {
      return;
    }
    await ensureAndInvokeSyncTrigger();
  }, [connection, ensureAndInvokeSyncTrigger]);

  return { connection, sync };
};
