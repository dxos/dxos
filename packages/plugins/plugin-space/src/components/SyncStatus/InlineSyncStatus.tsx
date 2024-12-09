//
// Copyright 2024 DXOS.org
//

import React, { type CSSProperties, useEffect, useMemo, useState } from 'react';

import { QueryEdgeStatusResponse } from '@dxos/protocols/proto/dxos/client/services';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Icon, useTranslation } from '@dxos/react-ui';

import { useSpaceSyncState } from './sync-state';
import { SPACE_PLUGIN } from '../../meta';

const useEdgeStatus = (): QueryEdgeStatusResponse.EdgeStatus => {
  const [status, setStatus] = useState(QueryEdgeStatusResponse.EdgeStatus.NOT_CONNECTED);
  const client = useClient();

  useEffect(() => {
    client.services.services.EdgeAgentService?.queryEdgeStatus().subscribe(({ status }) => {
      setStatus(status);
    });
  }, [client]);

  return status;
};

export const InlineSyncStatus = ({ space }: { space: Space }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const animationProps = useMemo<CSSProperties>(
    () => ({
      // Synchronize animations.
      animationDelay: `-${Date.now() % 1000}ms`,
    }),
    [],
  );

  const connectedToEdge = useEdgeStatus() === QueryEdgeStatusResponse.EdgeStatus.CONNECTED;
  // TODO(wittjosiah): This is not reactive.
  const edgeSyncEnabled = space.internal.data.edgeReplication === EdgeReplicationSetting.ENABLED;
  const syncState = useSpaceSyncState(space);
  if (!connectedToEdge || !edgeSyncEnabled || !syncState || syncState.missingOnLocal === 0) {
    return null;
  }

  return (
    <div role='status' aria-label={t('syncing message')} className='flex items-center'>
      <Icon icon='ph--arrows-clockwise--regular' size={3} style={animationProps} classNames='animate-spin' />
    </div>
  );
};
