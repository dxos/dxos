//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Surface, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { Filter, Obj } from '@dxos/echo';
import { Connection, ConnectorAuth } from '@dxos/plugin-connector';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';

import { IBKR_CONNECTOR_ID } from '../../constants';
import { meta } from '../../meta';
import { Ibkr, IbkrOperation } from '../../types';

// Stable reference for the ConnectorAuth Surface's `connectorIds` (avoids a new object each render).
const CONNECTOR_AUTH_DATA = { connectorIds: [IBKR_CONNECTOR_ID] };

export type PortfolioSyncActionProps = {
  /** The Portfolio whose space owns the IBKR connection and report feed. */
  subject: Ibkr.Portfolio;
};

/**
 * Toolbar action mirroring the Gmail mailbox connect/sync switch. IBKR has no
 * `SyncBinding`, so the connection is detected space-wide by `connectorId`: when
 * none exists we render the connector's auth Surface (a "Connect Interactive
 * Brokers" button); once connected we render a Sync `IconButton` that invokes
 * {@link SyncPortfolioReport} for the Portfolio's space.
 */
export const PortfolioSyncAction = ({ subject }: PortfolioSyncActionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const pluginManager = usePluginManager();
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(subject);
  const connections = useQuery(db, Filter.type(Connection.Connection));
  const connection = connections.find((connection) => connection.connectorId === IBKR_CONNECTOR_ID);
  const [syncing, setSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await invokePromise(IbkrOperation.SyncPortfolioReport, {}, { spaceId: db?.spaceId });
    } finally {
      setSyncing(false);
    }
  }, [invokePromise, db]);

  if (connection) {
    return (
      <IconButton
        disabled={syncing}
        variant='primary'
        iconClassNames={syncing ? 'animate-spin' : undefined}
        icon={syncing ? 'ph--spinner-gap--regular' : 'ph--arrows-clockwise--regular'}
        label={syncing ? t('syncing.label') : t('sync.label')}
        onClick={() => {
          void handleSync();
        }}
      />
    );
  }

  // No connection yet: render the connector's auth button through its Surface (like "Connect Gmail").
  return Surface.isAvailable(pluginManager.capabilities, { type: ConnectorAuth, data: CONNECTOR_AUTH_DATA }) ? (
    <Surface.Surface type={ConnectorAuth} data={CONNECTOR_AUTH_DATA} limit={1} />
  ) : null;
};
