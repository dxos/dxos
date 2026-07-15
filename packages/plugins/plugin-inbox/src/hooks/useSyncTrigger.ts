//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useMemo, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { Trigger } from '@dxos/compute';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Connector } from '@dxos/plugin-connector';
import { useObject, useQuery } from '@dxos/react-client/echo';

// Direct path, not the `#components` barrel: some components in that barrel import from `#hooks`
// (which exports this file), so going through the barrel would create a module cycle.
import { useTargetConnection } from '../components/Initialize/useTargetConnection';
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
  const triggers = useQuery(db, Query.select(Filter.type(Trigger.Trigger)).debugLabel('plugin-inbox.useSyncTrigger'));
  const { connection } = useTargetConnection(subject);
  const connectorEntries = useCapabilities(Connector);

  const subjectUri = Obj.getURI(subject);
  const syncTrigger = useMemo(
    () =>
      triggers.find((trigger) => {
        if (trigger.spec?.kind !== 'timer') {
          return false;
        }
        const mailboxRef = trigger.input?.mailbox;
        const calendarRef = trigger.input?.calendar;
        const ref = mailboxRef ?? calendarRef;
        return ref?.uri && ref.uri === subjectUri;
      }),
    [triggers, subjectUri],
  );

  const [syncEnabled, setSyncEnabled] = useObject(syncTrigger, 'enabled');

  const handleToggleSync = useCallback(async () => {
    if (!db) {
      return;
    }

    if (syncTrigger) {
      setSyncEnabled((enabled) => !enabled);
      return;
    }

    if (!connection) {
      return;
    }
    const connector = connectorEntries.flat().find((entry) => entry.id === connection.connectorId);
    if (!connector?.sync) {
      return;
    }

    setPending(true);
    try {
      const cursor = await findBindingForTarget(subject).pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise);
      if (!cursor) {
        return;
      }
      await createSyncRoutine({ db, target: subject, cursor, sync: connector.sync });
    } finally {
      setPending(false);
    }
  }, [syncTrigger, db, subject, connection, connectorEntries]);

  return { syncEnabled, syncTrigger, pending, handleToggleSync };
};
