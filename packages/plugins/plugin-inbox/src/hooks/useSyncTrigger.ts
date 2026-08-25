//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useMemo, useState } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Filter, Obj, Query, Type } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import * as Binding from '@dxos/plugin-connector/Binding';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as SyncTemplate from '@dxos/plugin-connector/SyncTemplate';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

// Direct path, not the `#components` barrel: some components in that barrel import from `#hooks`
// (which exports this file), so going through the barrel would create a module cycle.
import { useConnectorEntry, useTargetConnection } from '../components/Initialize/useTargetConnection';

/**
 * Hook to find, create, and toggle a timer-based sync Routine for a mailbox or calendar. An existing
 * routine's trigger is toggled in place; when none exists, toggling on opens the create-object dialog
 * seeded with the connector's sync routine template, so the routine is created through the form the
 * user can see and edit rather than silently, and saving it runs the first sync.
 *
 * `connectors` (the registered `Connector` capability list) is resolved by the calling container and
 * threaded down to `useConnectorEntry` — components and the hooks they use must not resolve
 * capabilities themselves.
 */
export const useSyncTrigger = ({
  db,
  subject,
  connectors = [],
}: {
  db: Database.Database | undefined;
  subject: Obj.Unknown;
  connectors?: readonly ConnectorSpec.ConnectorEntry[][];
}): {
  syncEnabled: boolean | undefined;
  syncTrigger: Trigger.Trigger | undefined;
  pending: boolean;
  handleToggleSync: () => Promise<void>;
} => {
  const [pending, setPending] = useState(false);
  const { invokePromise } = useOperationInvoker();
  const manager = usePluginManager();
  const { connection } = useTargetConnection(subject);
  const connector = useConnectorEntry(connection, connectors);

  // The sync trigger references the connection as its `input.connection`, so it is reached by the
  // reverse-ref from the connection rather than from the subject.
  const connectionTriggers = useQuery(
    // Skip until the connection resolves — passing no db yields no results without breaking hook order.
    connection ? db : undefined,
    // `connection` is always set when a db is passed, so this id is never the fallback's.
    Query.select(Filter.id(connection?.id ?? subject.id))
      .referencedBy(Trigger.Trigger)
      .debugLabel('plugin-inbox.useSyncTrigger.connection'),
  );

  const syncTrigger = useMemo(
    () => connectionTriggers.find((trigger) => trigger.spec?.kind === 'timer'),
    [connectionTriggers],
  );

  const [syncEnabled, setSyncEnabled] = useObject(syncTrigger, 'enabled');

  const handleToggleSync = useCallback(async () => {
    if (!db || !invokePromise) {
      return;
    }

    if (syncTrigger) {
      setSyncEnabled((enabled) => !enabled);
      return;
    }

    // Only a connector that declares a schedule can have a sync routine created for it.
    const operation = connector?.sync?.operation;
    const spec = connector?.sync?.trigger;
    if (!connection || !operation || !spec) {
      return;
    }

    setPending(true);
    try {
      // The routine is created through the seeded create-routine form, never silently; the scaffold
      // needs the binding, so bail (rather than open a failing dialog) when the subject has none.
      const cursor = await Binding.queryCursor(subject).pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise);
      if (!cursor) {
        return;
      }
      const { data } = await invokePromise(SpaceOperation.OpenObjectForm, {
        target: db,
        typename: Type.getTypename(Routine.Routine),
        defaults: { templateId: SyncTemplate.ID, subject },
        navigable: false,
      });
      // Turning sync on is the ask, so the save runs the first sync rather than leaving the
      // mailbox empty until the schedule comes round. The trigger is read off the saved routine —
      // a lookup here would race the reverse-ref index.
      const created = data?.target;
      if (created) {
        Effect.runFork(
          Binding.syncCreatedRoutine({ created, connector, spaceId: db.spaceId }).pipe(
            Effect.provideService(Capability.Service, manager.capabilities),
            Effect.catch((error) => Effect.sync(() => log.warn('first sync after routine created failed', { error }))),
            // An EDGE force-run that outlives its replication backoff arrives as a defect
            // (`Effect.orDie`), which the typed catch above would let escape unreported.
            Effect.catchDefect((defect) =>
              Effect.sync(() => log.warn('first sync after routine created died', { defect })),
            ),
          ),
        );
      }
    } finally {
      setPending(false);
    }
  }, [syncTrigger, db, subject, connection, connector, invokePromise, manager.capabilities]);

  return { syncEnabled, syncTrigger, pending, handleToggleSync };
};
