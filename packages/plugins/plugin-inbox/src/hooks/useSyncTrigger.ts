//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useMemo, useState } from 'react';

import { Trigger } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { connectedRoutinesQuery } from '@dxos/plugin-routine';
import { useObject, useQuery } from '@dxos/react-client/echo';

// Direct path, not the `#components` barrel: some components in that barrel import from `#hooks`
// (which exports this file), so going through the barrel would create a module cycle.
import { useConnectorEntry, useTargetConnection } from '../components/Initialize/useTargetConnection';
import { createSyncRoutine, findBindingForTarget } from '../util';

/**
 * Hook to find, create, and toggle a timer-based sync Routine for a mailbox or calendar. Creation
 * wires the trigger to the bound connector's own `sync` operation (the same one
 * `ConnectorOperation.SyncConnection` invokes directly) via {@link createSyncRoutine}.
 */
export const useSyncTrigger = ({
  db,
  subject,
}: {
  db: Database.Database | undefined;
  subject: Obj.Unknown;
}): {
  syncEnabled: boolean | undefined;
  syncTrigger: Trigger.Trigger | undefined;
  pending: boolean;
  handleToggleSync: () => Promise<void>;
} => {
  const [pending, setPending] = useState(false);
  // The sync trigger is the `timer` trigger of a Routine associated with this subject (via `subject`,
  // or legacy triggers whose `input` refs it — both are covered by `connectedRoutinesQuery`).
  const routines = useQuery(db, connectedRoutinesQuery(subject));
  const { connection } = useTargetConnection(subject);
  const connector = useConnectorEntry(connection);

  const syncTrigger = useMemo(() => {
    for (const routine of routines) {
      const trigger = routine.triggers.find((ref) => ref.target?.spec?.kind === 'timer')?.target;
      if (trigger) {
        return trigger;
      }
    }
    return undefined;
  }, [routines]);

  const [syncEnabled, setSyncEnabled] = useObject(syncTrigger, 'enabled');

  const handleToggleSync = useCallback(async () => {
    if (!db) {
      return;
    }

    if (syncTrigger) {
      setSyncEnabled((enabled) => !enabled);
      return;
    }

    const sync = connector?.sync;
    if (!connection || !sync) {
      return;
    }

    setPending(true);
    try {
      await Effect.gen(function* () {
        const cursor = yield* findBindingForTarget(subject);
        if (!cursor) {
          return;
        }
        yield* createSyncRoutine({ target: subject, cursor, sync });
      }).pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise);
    } finally {
      setPending(false);
    }
  }, [syncTrigger, db, subject, connection, connector]);

  return { syncEnabled, syncTrigger, pending, handleToggleSync };
};
