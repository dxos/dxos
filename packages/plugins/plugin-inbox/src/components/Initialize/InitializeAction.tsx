//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface, usePluginManager } from '@dxos/app-framework/ui';
import { type Operation } from '@dxos/compute';
import { type Obj, Ref } from '@dxos/echo';
import { ConnectorAuth } from '@dxos/plugin-connector';
import { IconButton } from '@dxos/react-ui';

import { useTargetSync } from './useTargetConnection';

export type InitializeActionProps<T extends Obj.Any> = {
  /** The object whose Connection we're connecting / syncing. */
  target: T;
  /** Connector id forwarded to the auth Surface (`'gmail'`, `'google-calendar'`, …) for the connect CTA. */
  connectorId: string;
  /** Already-translated label for the sync action. */
  syncLabel: string;
  /** Per-phase notifications shown for the sync invocation. */
  notify?: Operation.NotifyOptions;
};

/**
 * Toolbar action for the "initialize / connect this thing" empty state.
 * When a `Connection` is bound to `target` (via a `SyncBinding`) we render an
 * `IconButton` that runs the bound connector's `sync` op (resolved by
 * {@link useTargetSync}); otherwise we render the `ConnectorAuth` Surface (if
 * registered) so the user can connect a connector.
 *
 * Used by `InitializeMailboxAction` and `InitializeCalendarAction`.
 */
export const InitializeAction = <T extends Obj.Any>({
  target,
  connectorId,
  syncLabel,
  notify,
}: InitializeActionProps<T>) => {
  const pluginManager = usePluginManager();
  const { connection, sync, syncing } = useTargetSync(target, notify);

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

  const data = { connectorId, existingTarget: Ref.make(target) };
  return Surface.isAvailable(pluginManager.capabilities, { type: ConnectorAuth, data }) ? (
    <Surface.Surface type={ConnectorAuth} data={data} limit={1} />
  ) : null;
};
