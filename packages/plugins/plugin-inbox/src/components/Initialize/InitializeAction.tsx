//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { type Operation } from '@dxos/compute';
import { type Obj } from '@dxos/echo';
import { IconButton } from '@dxos/react-ui';
import { Menu, graphActions, isToolbarAction, useMenuActions } from '@dxos/react-ui-menu';

import { useTargetSync } from './useTargetConnection';

export type InitializeActionProps<T extends Obj.Any> = {
  /** The object whose Connection we're connecting / syncing. */
  target: T;
  /** Graph node id of `target` (its URI / attendableId); the connect action contributed by this
   * plugin's own app-graph-builder hangs off this. */
  nodeId: string;
  /** Already-translated label for the sync action. */
  syncLabel: string;
  /** Per-phase notifications shown for the sync invocation. */
  notify?: Operation.NotifyOptions;
};

/**
 * Toolbar action for the "initialize / connect this thing" empty state.
 * When a `Connection` is bound to `target` (via a `SyncBinding`) we render an
 * `IconButton` that runs the bound connector's `sync` op (resolved by
 * {@link useTargetSync}); otherwise we render the connect action contributed by this plugin's own
 * app-graph-builder (`mailboxConnectorAuth` / `calendarConnectorAuth`) via {@link graphActions}.
 *
 * Used by `InitializeMailboxAction` and `InitializeCalendarAction`.
 */
export const InitializeAction = <T extends Obj.Any>({
  target,
  nodeId,
  syncLabel,
  notify,
}: InitializeActionProps<T>) => {
  const { connection, sync, syncing } = useTargetSync(target, notify);

  const { graph } = useAppGraph();
  const connectActions = useMemo(
    () => Atom.make((get) => graphActions(graph, get, nodeId, { filter: isToolbarAction })),
    [graph, nodeId],
  );
  const connectMenuActions = useMenuActions(connectActions);

  if (connection) {
    return (
      <IconButton
        disabled={syncing}
        variant='primary'
        iconClassNames={syncing ? 'animate-spin' : undefined}
        icon={syncing ? 'ph--spinner-gap--regular' : 'ph--arrow-clockwise--regular'}
        label={syncLabel}
        onClick={sync}
      />
    );
  }

  return (
    <Menu.Root {...connectMenuActions} attendableId={nodeId}>
      <Menu.Toolbar />
    </Menu.Root>
  );
};
