//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useEffect, useState } from 'react';

import { useAppGraph } from '@dxos/app-framework/react';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { useClient } from '@dxos/react-client';
import { type Space, useSpaceSyncState } from '@dxos/react-client/echo';
import { Tooltip, useTranslation } from '@dxos/react-ui';
import { AttentionGlyph, useAttended, useAttention } from '@dxos/react-ui-attention';

import { usePath } from '../../hooks';
import { meta } from '../../meta';

const useEdgeStatus = (): EdgeStatus.ConnectionState => {
  const [status, setStatus] = useState(EdgeStatus.ConnectionState.NOT_CONNECTED);
  const client = useClient();
  useEffect(() => {
    client.services.services.EdgeAgentService?.queryEdgeStatus().subscribe(({ status }) => {
      setStatus(status.state);
    });
  }, [client]);

  return status;
};

export const InlineSyncStatus = ({ space, open }: { space: Space; open?: boolean }) => {
  const { t } = useTranslation(meta.id);
  const id = space.id;
  const { hasAttention, isAncestor, isRelated } = useAttention(id);
  const isAttended = hasAttention || isAncestor || isRelated;

  // TODO(wittjosiah): If the attended node is deep in the graph and the graph is not fully loaded
  //   this will result in an empty path until the graph is connected.
  // TODO(wittjosiah): Consider using this indicator for all open nodes instead of just attended.
  const { graph } = useAppGraph();
  const attended = useAttended();
  const startOfAttention = attended.at(-1);
  const path = usePath(graph, startOfAttention);
  const containsAttended = !open && !isAttended && id && Option.isSome(path) ? path.value.includes(id) : false;

  const connectedToEdge = useEdgeStatus() === EdgeStatus.ConnectionState.CONNECTED;
  // TODO(wittjosiah): This is not reactive.
  const edgeSyncEnabled = space.internal.data.edgeReplication === EdgeReplicationSetting.ENABLED;
  const syncState = useSpaceSyncState(space);
  const syncing = connectedToEdge && edgeSyncEnabled && syncState && syncState.missingOnLocal > 0;

  return (
    <Tooltip.Trigger asChild content={t('syncing label')} side='bottom'>
      <AttentionGlyph
        syncing={syncing}
        attended={isAttended}
        containsAttended={containsAttended}
        classNames='self-center mie-1'
      />
    </Tooltip.Trigger>
  );
};
