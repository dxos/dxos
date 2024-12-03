//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { QueryEdgeStatusResponse } from '@dxos/protocols/proto/dxos/client/services';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Icon } from '@dxos/react-ui';

import { useSpaceSyncState } from './sync-state';

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
  const connectedToEdge = useEdgeStatus() === QueryEdgeStatusResponse.EdgeStatus.CONNECTED;
  // TODO(wittjosiah): This is not reactive.
  const edgeSyncEnabled = space.internal.data.edgeReplication === EdgeReplicationSetting.ENABLED;
  const syncState = useSpaceSyncState(space);
  if (!connectedToEdge || !edgeSyncEnabled || !syncState || syncState.missingOnLocal === 0) {
    return null;
  }

  return (
    <div role='none' className='flex items-center'>
      <Icon icon='ph--arrows-clockwise--regular' size={3} classNames='animate-spin' />
    </div>
  );
};
