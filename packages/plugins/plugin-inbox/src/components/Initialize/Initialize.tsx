//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Obj } from '@dxos/echo';
import { Message } from '@dxos/react-ui';
import { composable } from '@dxos/react-ui';

import { InitializeEmpty } from './InitializeEmpty';
import { useTargetIntegration } from './useTargetIntegration';

export type InitializeProps<T extends Obj.Any> = {
  /** The object whose Integration we're connecting / syncing. */
  target: T;
  /** Already-translated warning shown when no integration targets `target`. */
  noIntegrationMessage: string;
  /** Already-translated message shown when an integration exists but the target is still empty. */
  emptyMessage?: string;
};

/**
 * Shared empty-state body for "initialize / connect this thing" panels.
 * Renders a warning message that depends on whether an `Integration` targets
 * `target`. The connect / sync action lives in `InitializeAction` so it can
 * be slotted into the surrounding panel's toolbar.
 *
 * Used by `InitializeMailbox` and `InitializeCalendar`.
 */
export const Initialize = composable<HTMLDivElement, InitializeProps<any>>(
  ({ target, noIntegrationMessage, emptyMessage, ...props }, forwardedRef) => {
    const { integration } = useTargetIntegration(target);
    const message = integration ? emptyMessage : noIntegrationMessage;

    return (
      <InitializeEmpty {...props} ref={forwardedRef}>
        {message && (
          <Message.Root valence='warning'>
            <Message.Title>{message}</Message.Title>
          </Message.Root>
        )}
      </InitializeEmpty>
    );
  },
);

Initialize.displayName = 'Initialize';
