//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Connection } from '@dxos/plugin-connector';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Menu, graphActions, isToolbarAction, useMenuActions } from '@dxos/react-ui-menu';

import { IBKR_CONNECTOR_ID } from '../../constants';
import { meta } from '../../meta';
import { Ibkr, IbkrOperation } from '../../types';

export type PortfolioSyncActionProps = {
  /** The Portfolio whose space owns the IBKR connection and report feed. */
  subject: Ibkr.Portfolio;
  attendableId?: string;
};

/**
 * Toolbar action mirroring the Gmail mailbox connect/sync switch. IBKR has no
 * `SyncBinding`, so the connection is detected space-wide by `connectorId`: when
 * none exists we render the connect action contributed by this plugin's own
 * app-graph-builder (a "Connect Interactive Brokers" button); once connected we
 * render a Sync `IconButton` that invokes {@link SyncPortfolioReport} for the Portfolio's
 * space, then {@link SyncLots} from the latest stored report (lots sync runs even when the
 * fetch fails).
 */
export const PortfolioSyncAction = ({ subject, attendableId }: PortfolioSyncActionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(subject);
  const connections = useQuery(db, Filter.type(Connection.Connection));
  const connection = connections.find((connection) => connection.connectorId === IBKR_CONNECTOR_ID);
  const [syncing, setSyncing] = useState(false);

  const { graph } = useAppGraph();
  const connectActions = useMemo(
    () => Atom.make((get) => graphActions(graph, get, attendableId, { filter: isToolbarAction })),
    [graph, attendableId],
  );
  const connectMenuActions = useMenuActions(connectActions);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      try {
        await invokePromise(IbkrOperation.SyncPortfolioReport, {}, { spaceId: db?.spaceId });
      } catch (error) {
        // Report fetch is best-effort; lots sync from the latest stored report even when fetch fails.
        log.catch(error);
      }
      try {
        await invokePromise(IbkrOperation.SyncLots, { account: Ref.make(subject) }, { spaceId: db?.spaceId });
      } catch (error) {
        log.catch(error);
      }
    } finally {
      setSyncing(false);
    }
  }, [invokePromise, db, subject]);

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

  // No connection yet: render the connect action contributed by the app graph (like "Connect Gmail").
  return (
    <Menu.Root {...connectMenuActions} attendableId={attendableId}>
      <Menu.Toolbar />
    </Menu.Root>
  );
};

PortfolioSyncAction.displayName = 'PortfolioSyncAction';
