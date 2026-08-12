//
// Copyright 2026 DXOS.org
//

import * as Trigger from '@dxos/compute/Trigger';
import { Obj, Ref } from '@dxos/echo';
import { type Connection } from '@dxos/link';
import { makeRoutine } from '@dxos/plugin-routine';

import * as ConnectorOperation from '../types/ConnectorOperation';

/**
 * Build the sync Routine for `connection` as a fully-wired, unpersisted draft graph: one Routine per
 * account, wrapping a trigger built from the connector's declared `sync.trigger` spec and bound to
 * {@link ConnectorOperation.SyncConnection} — which fans out over every binding of the connection, so
 * targets added or removed later are covered without touching the routine. The `priority` input is an
 * event template: a manual sync from one target's button carries its binding on the fire event
 * (pressed-first ordering), while scheduled fires resolve it to nothing.
 *
 * Consumed by the connector's routine template, where the draft is shown editable in the
 * create-routine form and persisted on Save — sync routines are never persisted silently.
 */
export const scaffoldConnectionSyncRoutine = ({
  name,
  connection,
  spec,
  remote,
}: {
  name?: string;
  connection: Connection.Connection;
  spec: Trigger.Spec;
  remote?: boolean;
}) => {
  // `remote` is left unset for a local connector rather than written as `false`, so the trigger
  // editor shows the schema default instead of a stored choice the connector never made.
  const trigger = Trigger.make({
    enabled: true,
    ...(remote ? { remote: true } : {}),
    spec,
    input: { connection: Ref.make(connection), priority: '{{event.data.priority}}' },
  });

  return makeRoutine({
    // Label the routine after the account so multiple connections stay distinguishable.
    name: name ?? syncRoutineName(connection),
    // SyncConnection is statically defined and already in the registry, so the routine refers to it
    // by key rather than persisting a copy of it into the space.
    spec: { kind: 'runnable', runnable: Ref.fromURI(ConnectorOperation.SyncConnection.meta.key) },
    trigger,
  });
};

const syncRoutineName = (connection: Connection.Connection): string => {
  const label = Obj.getLabel(connection) ?? connection.name;
  return label ? `Sync — ${label}` : 'Sync';
};
