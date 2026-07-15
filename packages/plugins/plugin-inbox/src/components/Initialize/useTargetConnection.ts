//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { useCallback, useMemo } from 'react';

import { useOperationInvoker, useSpaceCallback } from '@dxos/app-framework/ui';
import { type Operation, Trigger, type TriggerEvent } from '@dxos/compute';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { Connection, ConnectorOperation, isCursorForTarget } from '@dxos/plugin-connector';
import { connectedRoutinesQuery } from '@dxos/plugin-routine';
import { useQuery } from '@dxos/react-client/echo';
import { useAtomState } from '@dxos/react-hooks';

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

/**
 * Build a `sync` callback for `target`: when a sync timer trigger exists for `target`, force-runs it
 * via {@link Trigger.TriggerMonitorService.invokeTrigger} (edge or local, per the trigger's own
 * `remote` flag — the monitor decides, not this hook); otherwise resolves the bound {@link Connection}
 * and invokes {@link ConnectorOperation.SyncConnection} directly — the same shared fan-out handler the
 * connection settings' "Sync now" and the mailbox node's context-menu action use, for connectors with
 * no deployed sync trigger (JMAP, Contacts). Tracks an in-flight `syncing` flag for the empty-state UI.
 *
 * `connection` exposes whether the target is bound (drives "connect vs. sync").
 *
 * Used by `MailboxArticle` and `CalendarArticle` for their inline "Sync" toolbar action.
 */
export const useTargetSync = <T extends Obj.Any>(
  target: T,
  notify?: Operation.NotifyOptions,
): {
  connection: Connection.Connection | undefined;
  sync: () => Promise<void>;
  /** In-flight flag as an atom so a menu builder can read it reactively via `get`. */
  syncing: Atom.Atom<boolean>;
} => {
  const { connection } = useTargetConnection(target);
  const db = Obj.getDatabase(target);
  const { invokePromise } = useOperationInvoker();
  const { atom: syncing, set: setSyncing } = useAtomState(false);
  const syncTrigger = useSyncTimerTrigger(db, target);

  const invokeSyncTrigger = useSpaceCallback(
    db?.spaceId,
    [Trigger.TriggerMonitorService],
    Effect.fnUntraced(function* () {
      if (!syncTrigger) {
        return;
      }
      const monitor = yield* Trigger.TriggerMonitorService;
      yield* monitor.invokeTrigger({
        trigger: syncTrigger,
        event: { tick: Date.now() } satisfies TriggerEvent.TimerEvent,
      });
    }),
    [syncTrigger],
  );

  const sync = useCallback(async () => {
    if (!connection) {
      return;
    }
    setSyncing(true);
    try {
      if (syncTrigger) {
        await invokeSyncTrigger();
        return;
      }
      await invokePromise(
        ConnectorOperation.SyncConnection,
        { connection: Ref.make(connection) },
        { spaceId: db?.spaceId, notify },
      );
    } finally {
      setSyncing(false);
    }
  }, [invokePromise, connection, db, notify, setSyncing, syncTrigger, invokeSyncTrigger]);

  return { connection, sync, syncing };
};
