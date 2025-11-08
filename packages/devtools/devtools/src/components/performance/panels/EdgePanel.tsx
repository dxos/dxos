//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Context } from '@dxos/context';
import { type EdgeStatus } from '@dxos/protocols';
import { type QueryEdgeStatusResponse, EdgeStatus as WsStatus } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { IconButton } from '@dxos/react-ui';

import { type CustomPanelProps, Panel } from '../Panel';

import { Table, type TableProps, Unit } from './Table';

export const EdgePanel = ({ edge, ...props }: CustomPanelProps<{ edge?: QueryEdgeStatusResponse }>) => {
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

  const rows = useMemo(() => getHealthReportTable(edgeStatus, edge?.status), [edgeStatus, edge?.status]);

  return (
    <Panel
      {...props}
      icon='ph--cloud--regular'
      title='Edge'
      info={<div className='flex items-center gap-2'> {edgeStatus?.problems.length === 0 ? '✅' : '❌'}</div>}
    >
      <div className='flex flex-col is-full gap-2 text-xs'>
        <div className='flex items-center gap-2'>
          <IconButton icon='ph--arrow-clockwise--regular' label={'refresh'} onClick={handleRefresh} />
          <IconButton icon='ph--copy--regular' label={'copy raw'} onClick={handleCopyRaw} />
        </div>
        <Table rows={rows} />
        {edgeStatus?.problems.length && (
          <div className='flex flex-col'>
            <span>Problems ⚠️:</span>
            {edgeStatus.problems.map((problem, index) => (
              <span key={index}>
                {index + 1}. {problem}
              </span>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
};

const getHealthReportTable = (status?: EdgeStatus, wsStatus?: WsStatus): TableProps['rows'] => {
  const isConnected = wsStatus?.state === WsStatus.ConnectionState.CONNECTED;
  const rows: TableProps['rows'] = [
    [isConnected ? '✅' : '❌', 'web socket', isConnected ? 'Connected' : 'Disconnected'],
    ...(!isConnected
      ? []
      : [
          ['', 'uptime', wsStatus?.uptime?.toFixed(0) ?? 'N/A', 's'],
          ['', 'RTT', wsStatus?.rtt?.toFixed(0) ?? 'N/A', 'ms'],
          ['', 'up', Unit.KB(wsStatus?.rateBytesUp ?? 0), 'KB/s'],
          ['', 'down', Unit.KB(wsStatus?.rateBytesDown ?? 0), 'KB/s'],
        ]),
  ];

  if (!status) {
    return rows;
  }

  rows.push(
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
  );

  return rows;
};
