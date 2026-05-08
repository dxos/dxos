//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { Surface, usePluginManager } from '@dxos/app-framework/ui';
import { type Operation } from '@dxos/compute';
import { type Obj, Ref } from '@dxos/echo';
import { IconButton, Message } from '@dxos/react-ui';
import { composable } from '@dxos/ui-theme';

import { InitializeEmpty } from './InitializeEmpty';
import { useTargetIntegration } from './useTargetIntegration';

export type InitializeProps<T extends Obj.Any> = {
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
  /** Already-translated warning shown when no integration targets `target`. */
  noIntegrationMessage: string;
  /** Already-translated message shown above the sync action when an integration exists (optional). */
  emptyMessage?: string;
};

/**
 * Shared "connect or sync" empty state. When no `Integration` targets the
 * given object we render a warning and (if registered) the
 * `integration--auth` Surface. When one exists we render an `IconButton`
 * that invokes `operation`, paired with an optional `emptyMessage` for
 * the case where the integration is wired but the target's content is
 * still empty (e.g. a calendar that hasn't synced yet).
 *
 * Used by `InitializeMailbox` and `InitializeCalendar`.
 */
export const Initialize = composable<HTMLDivElement, InitializeProps<any>>(
  (
    { target, targetKey, providerId, operation, syncLabel, noIntegrationMessage, emptyMessage, ...props },
    forwardedRef,
  ) => {
    const pluginManager = usePluginManager();
    const { integration, sync, syncing } = useTargetIntegration(target, operation, targetKey);

    let message: string | undefined;
    let action: ReactNode;
    if (integration) {
      message = emptyMessage;
      action = (
        <IconButton
          disabled={syncing}
          variant='primary'
          iconClassNames={syncing ? 'animate-spin' : undefined}
          icon={syncing ? 'ph--spinner-gap--regular' : 'ph--arrow-clockwise--regular'}
          label={syncLabel}
          onClick={sync}
        />
      );
    } else {
      message = noIntegrationMessage;
      const data = { providerId, existingTarget: Ref.make(target) };
      action = Surface.isAvailable(pluginManager.capabilities, { role: 'integration--auth', data }) ? (
        <Surface.Surface role='integration--auth' data={data} limit={1} />
      ) : null;
    }

    return (
      <InitializeEmpty {...props} ref={forwardedRef}>
        {message && (
          <Message.Root valence='warning'>
            <Message.Title>{message}</Message.Title>
          </Message.Root>
        )}
        {action}
      </InitializeEmpty>
    );
  },
);

Initialize.displayName = 'Initialize';
