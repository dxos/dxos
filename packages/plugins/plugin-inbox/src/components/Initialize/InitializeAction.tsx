//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface, usePluginManager } from '@dxos/app-framework/ui';
import { type Operation } from '@dxos/compute';
import { type Obj, Ref } from '@dxos/echo';
import { ConnectorAuth } from '@dxos/plugin-connector';
import { IconButton } from '@dxos/react-ui';

import { useTargetSync } from './useTargetConnection';

export type InitializeActionProps<T extends Obj.Any> = {
  /** The object whose Connection we're connecting / syncing. */
  target: T;
  /** Connector ids offered by the auth Surface's connect dropdown (e.g. `['gmail', 'jmap-mail']`). */
  connectorIds: readonly string[];
  /** Already-translated label for the sync action. */
  syncLabel: string;
  /** Per-phase notifications shown for the sync invocation. */
  notify?: Operation.NotifyOptions;
  /** Optional test id for the sync button (e2e targeting). */
  syncTestId?: string;
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
  connectorIds,
  syncLabel,
  notify,
  syncTestId,
}: InitializeActionProps<T>) => {
  const pluginManager = usePluginManager();
  const { connection, sync, syncing } = useTargetSync(target, notify);

  // Stable Surface data so the downstream ConnectorAuth Surface (ConnectorAuthButton) doesn't
  // re-render on every parent render with a fresh `connectorIds` array / `existingTarget` ref.
  const data = useMemo(() => ({ connectorIds, existingTarget: Ref.make(target) }), [connectorIds, target]);

  if (connection) {
    return (
      <IconButton
        disabled={syncing}
        variant='primary'
        iconClassNames={syncing ? 'animate-spin' : undefined}
        icon={syncing ? 'ph--spinner-gap--regular' : 'ph--arrow-clockwise--regular'}
        label={syncLabel}
        data-testid={syncTestId}
        onClick={sync}
      />
    );
  }

  return Surface.isAvailable(pluginManager.capabilities, { type: ConnectorAuth, data }) ? (
    <Surface.Surface type={ConnectorAuth} data={data} limit={1} />
  ) : null;
};
