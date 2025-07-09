//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Context } from '@dxos/context';
import { type EdgeStatus } from '@dxos/protocols';
import { EdgeStatus as WsStatus, type QueryEdgeStatusResponse } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { IconButton } from '@dxos/react-ui';

import { Table, type TableProps } from './Table';
import { Panel, type CustomPanelProps } from '../Panel';

export const EdgePanel = ({ edge, ...props }: CustomPanelProps<{ edge?: QueryEdgeStatusResponse }>) => {
  const websocketHealth = edge?.status ?? WsStatus.NOT_CONNECTED;
  const client = useClient();

  const [edgeStatus, setEdgeStatus] = useState<EdgeStatus | undefined>();
  const handleRefresh = async () => {
    const status = await client.edge.getStatus();
    setEdgeStatus(status);
  };

  const handleCopyRaw = async () => {
    await navigator.clipboard.writeText(JSON.stringify(edgeStatus, null, 2));
  };

  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      client.edge.setIdentity(createEdgeIdentity(client));
      await handleRefresh();
    });

    return () => {
      void ctx.dispose();
    };
  }, []);

  const rows = useMemo(() => getHealthReportTable(edgeStatus, websocketHealth), [edgeStatus, websocketHealth]);

  return (
    <Panel
      {...props}
      icon='ph--cloud--regular'
      title='Edge'
      info={<div className='flex items-center gap-2'> {edgeStatus?.problems.length === 0 ? '✅' : '❌'}</div>}
    >
      <div className='flex flex-col w-full gap-2 text-xs'>
        <div className='flex items-center gap-2'>
          <IconButton icon='ph--arrow-clockwise--regular' label={'refresh'} onClick={handleRefresh} />
          <IconButton icon='ph--copy--regular' label={'copy raw'} onClick={handleCopyRaw} />
        </div>
        <Table rows={rows} />
        <div className='flex flex-col'>
          <span>Problems:</span>
          {edgeStatus?.problems.map((problem) => <span key={problem}>{problem}</span>)}
        </div>
      </div>
    </Panel>
  );
};

const getHealthReportTable = (status?: EdgeStatus, wsStatus?: WsStatus): TableProps['rows'] => {
  if (!status) {
    return [];
  }

  return [
    [
      wsStatus === WsStatus.CONNECTED ? '✅' : '❌',
      'web socket',
      wsStatus === WsStatus.CONNECTED ? 'Connected' : 'Disconnected',
    ],
    [
      (status.router.connectedDevices?.length ?? 0) > 0 && !status.router.fetchError ? '✅' : '❌',
      'router',
      `Devices: ${status.router.connectedDevices?.length ?? 0}`,
    ],
    [status.agent.agentStatus === 'active' ? '✅' : '❌', 'agent', status.agent.agentStatus ?? ''],
    [!status.spaces.fetchError ? '✅' : '❌', 'spaces', `Spaces: ${Object.keys(status.spaces.data ?? {}).length ?? 0}`],
    ...Object.entries(status.spaces.data ?? {}).map(([spaceId, space]) => [
      space.diagnostics?.redFlags?.length > 0 || space.fetchError ? '❌' : '✅',
      spaceId,
    ]),
  ];
};
