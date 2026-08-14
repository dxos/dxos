//
// Copyright 2026 DXOS.org
//

import type * as Operation from '@dxos/compute/Operation';
import * as Trigger from '@dxos/compute/Trigger';
import { Obj, Ref } from '@dxos/echo';
import { type Connection } from '@dxos/link';
import { makeRoutine } from '@dxos/plugin-routine';

import { ConnectorSpec } from '#types';

/**
 * Build the sync Routine for `connection` as a fully-wired, unpersisted draft graph: one Routine per
 * account, wrapping a trigger built from the connector's declared `sync.trigger` spec and bound to
 * the connector's own account-level sync operation — which fans out over every binding of the
 * connection (see `syncConnectionBindings`), so targets added or removed later are covered without
 * touching the routine. The `priority` input is an event template: a manual sync from one target's
 * button carries its binding on the fire event (pressed-first ordering), while scheduled fires
 * resolve it to nothing.
 *
 * Consumed by the connector's routine template, where the draft is shown editable in the
 * create-routine form and persisted on Save — sync routines are never persisted silently.
 */
export const scaffoldConnectionSyncRoutine = ({
  name,
  connection,
  operation,
  spec,
  remote,
}: {
  name?: string;
  connection: Connection.Connection;
  operation: Operation.Definition<ConnectorSpec.SyncInput, ConnectorSpec.SyncOutput>;
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
    // A connector's sync is statically defined and already in the registry, so the routine refers to
    // it by key rather than persisting a copy of it into the space.
    spec: { kind: 'runnable', runnable: Ref.fromURI(operation.meta.key) },
    trigger,
  });
};

const syncRoutineName = (connection: Connection.Connection): string => {
  const label = Obj.getLabel(connection) ?? connection.name;
  return label ? `Sync — ${label}` : 'Sync';
};
