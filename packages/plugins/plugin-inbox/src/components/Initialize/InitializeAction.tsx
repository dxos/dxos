//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface, usePluginManager } from '@dxos/app-framework/ui';
import { type Operation } from '@dxos/compute';
import { type Obj, Ref } from '@dxos/echo';
import { IntegrationAuth } from '@dxos/plugin-integration';
import { IconButton } from '@dxos/react-ui';

import { useTargetSync } from './useTargetIntegration';

export type InitializeActionProps<T extends Obj.Any> = {
  /** The object whose Integration we're connecting / syncing. */
  target: T;
  /** Key under which `target` is passed to `operation`'s payload (e.g. `'mailbox'`, `'calendar'`). */
  targetKey: string;
  /** Provider id forwarded to the auth Surface (`'gmail'`, `'google-calendar'`, …). */
  providerId: string;
  /** Operation invoked when the user clicks sync. Must accept `{ integration, [targetKey]: target }`. */
  operation: Operation.Definition<any, any>;
  /** Already-translated label for the sync action. */
  syncLabel: string;
  /** Per-phase notifications shown for the sync invocation. */
  notify?: Operation.NotifyOptions;
};

/**
 * Toolbar action for the "initialize / connect this thing" empty state.
 * When an `Integration` targets `target` we render an `IconButton` that
 * invokes `operation`; otherwise we render the `IntegrationAuth` Surface
 * (if registered) so the user can connect a provider.
 *
 * Used by `InitializeMailboxAction` and `InitializeCalendarAction`.
 */
export const InitializeAction = <T extends Obj.Any>({
  target,
  targetKey,
  providerId,
  operation,
  syncLabel,
  notify,
}: InitializeActionProps<T>) => {
  const pluginManager = usePluginManager();
  const { integration, sync, syncing } = useTargetSync(target, operation, targetKey, notify);

  if (integration) {
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

  const data = { providerId, existingTarget: Ref.make(target) };
  return Surface.isAvailable(pluginManager.capabilities, { type: IntegrationAuth, data }) ? (
    <Surface.Surface type={IntegrationAuth} data={data} limit={1} />
  ) : null;
};
