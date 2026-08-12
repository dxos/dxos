//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Filter, Obj, Query, Type } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { Cursor } from '@dxos/link';
import { SyncTemplateId, findBindingForTarget } from '@dxos/plugin-connector';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { SpaceOperation } from '@dxos/plugin-space';

// Direct path, not the `#components` barrel: some components in that barrel import from `#hooks`
// (which exports this file), so going through the barrel would create a module cycle.
import { useConnectorEntry, useTargetConnection } from '../components/Initialize/useTargetConnection';

/**
 * Hook to find, create, and toggle a timer-based sync Routine for a mailbox or calendar. An existing
 * routine's trigger is toggled in place; when none exists, toggling on opens the create-object dialog
 * seeded with the connector's sync routine template, so the routine is created through the form the
 * user can see and edit rather than silently.
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
  // A sync trigger doesn't reference its target directly — its `binding` refs a Cursor whose `spec.target`
  // is the target — so traverse the reverse-ref chain subject ← Cursor ← Trigger in a single query.
  const triggers = useQuery(
    db,
    Query.select(Filter.id(subject.id))
      .referencedBy(Cursor.Cursor)
      .referencedBy(Trigger.Trigger)
      .debugLabel('plugin-inbox.useSyncTrigger'),
  );
  const { connection } = useTargetConnection(subject);
  const connector = useConnectorEntry(connection, connectors);

  const syncTrigger = useMemo(() => triggers.find((trigger) => trigger.spec?.kind === 'timer'), [triggers]);

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
      const cursor = await findBindingForTarget(subject).pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise);
      if (!cursor) {
        return;
      }
      await invokePromise(SpaceOperation.OpenCreateObject, {
        target: db,
        typename: Type.getTypename(Routine.Routine),
        initialFormValues: { templateId: SyncTemplateId, subject },
        navigable: false,
      });
    } finally {
      setPending(false);
    }
  }, [syncTrigger, db, subject, connection, connector, invokePromise]);

  return { syncEnabled, syncTrigger, pending, handleToggleSync };
};
