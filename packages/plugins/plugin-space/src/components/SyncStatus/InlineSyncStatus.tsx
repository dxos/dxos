//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { useGraph } from '@dxos/plugin-graph';
import { QueryEdgeStatusResponse } from '@dxos/protocols/proto/dxos/client/services';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Tooltip, useTranslation } from '@dxos/react-ui';
import { AttentionGlyph, useAttended, useAttention } from '@dxos/react-ui-attention';

import { useSpaceSyncState } from './sync-state';
import { usePath } from '../../hooks';
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

export const InlineSyncStatus = ({ space, open }: { space: Space; open?: boolean }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const id = space.id;
  const { hasAttention, isAncestor, isRelated } = useAttention(id);
  const isAttended = hasAttention || isAncestor || isRelated;

  // TODO(wittjosiah): If the attended node is deep in the graph and the graph is not fully loaded
  //   this will result in an empty path until the graph is connected.
  // TODO(wittjosiah): Consider using this indicator for all open nodes instead of just attended.
  const { graph } = useGraph();
  const attended = useAttended();
  const startOfAttention = attended.at(-1);
  const path = usePath(graph, startOfAttention);
  const containsAttended = !open && !isAttended && id && path ? path.includes(id) : false;

  const connectedToEdge = useEdgeStatus() === QueryEdgeStatusResponse.EdgeStatus.CONNECTED;
  // TODO(wittjosiah): This is not reactive.
  const edgeSyncEnabled = space.internal.data.edgeReplication === EdgeReplicationSetting.ENABLED;
  const syncState = useSpaceSyncState(space);
  const syncing = connectedToEdge && edgeSyncEnabled && syncState && syncState.missingOnLocal > 0;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <AttentionGlyph
          syncing={syncing}
          attended={isAttended}
          containsAttended={containsAttended}
          classNames='self-center mie-1'
        />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side='bottom' classNames='z-[70]'>
          <span>{t('syncing label')}</span>
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
