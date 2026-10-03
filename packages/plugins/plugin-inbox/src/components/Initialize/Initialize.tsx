//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Obj } from '@dxos/echo';
import { Banner } from '@dxos/react-ui';
import { composable } from '@dxos/react-ui';

import { InitializeEmpty } from './InitializeEmpty.tsx';
import { useTargetConnection } from './useTargetConnection.ts';

export type InitializeProps<T extends Obj.Any> = {
  /** The object whose Connection we're connecting / syncing. */
  target: T;
  /** Already-translated warning shown when no connection is bound to `target`. */
  noConnectionsMessage: string;
  /** Already-translated message shown when a connection exists but the target is still empty. */
  emptyMessage?: string;
};

/**
 * Shared empty-state body for "initialize / connect this thing" panels. Renders a message that
 * depends on whether a `Connection` is bound to `target`. The connect action is contributed to
 * the article toolbar by the connector plugin (via the type's `ConnectorAuthAnnotation`); the sync
 * action is inlined in the article toolbar.
 *
 * Used by `InitializeMailbox` and `InitializeCalendar`.
 */
export const Initialize = composable<HTMLDivElement, InitializeProps<any>>(
  ({ target, noConnectionsMessage, emptyMessage, ...props }, forwardedRef) => {
    const { connection } = useTargetConnection(target);
    const message = connection ? emptyMessage : noConnectionsMessage;

    return (
      <InitializeEmpty {...props} ref={forwardedRef}>
        {message && (
          // A connected-but-empty target is a statement of fact, not something to act on — only the
          // missing connection is, so the warning valence stays with it.
          <Banner.Root valence={connection ? 'info' : 'warning'}>
            <Banner.Content>
              <Banner.Title>{message}</Banner.Title>
            </Banner.Content>
          </Banner.Root>
        )}
      </InitializeEmpty>
    );
  },
);

Initialize.displayName = 'Initialize';
