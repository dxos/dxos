//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

import { useConnector } from '#hooks';

import { Connection, ConnectorCoordinator } from '../types';

export type UseReauthenticateResult = {
  /** True when the connection's connector exposes an OAuth flow (drives button visibility). */
  readonly available: boolean;
  /** True while a reauthentication popup/redirect is being initiated. */
  readonly reauthenticating: boolean;
  /**
   * Re-run OAuth for the connection, replacing its stored token in place via the
   * {@link ConnectorCoordinator}. No-op when `available` is false.
   */
  readonly reauthenticate: () => void;
};

/**
 * Re-run OAuth for an existing {@link Connection} without recreating it. Only
 * OAuth connectors can be reauthenticated in place; for others `available` is
 * false and the caller hides the action.
 */
export const useReauthenticate = (connection: Connection.Connection | undefined): UseReauthenticateResult => {
  const manager = usePluginManager();
  const connector = useConnector(connection?.connectorId);
  const [reauthenticating, setReauthenticating] = useState(false);

  const reauthenticate = useCallback(() => {
    if (!connection || !connector?.oauth) {
      return;
    }
    const db = Obj.getDatabase(connection);
    if (!db) {
      return;
    }
    const coordinator = manager.capabilities.get(ConnectorCoordinator);
    if (!coordinator) {
      return;
    }
    setReauthenticating(true);
    void EffectEx.runAndForwardErrors(coordinator.reauthenticate({ db, connection: Ref.make(connection) }))
      .catch(() => {})
      .finally(() => setReauthenticating(false));
  }, [connection, connector, manager]);

  return {
    available: !!connector?.oauth,
    reauthenticating,
    reauthenticate,
  };
};
