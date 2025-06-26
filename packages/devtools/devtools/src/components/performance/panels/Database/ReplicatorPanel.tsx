//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { K, Table, type TableProps } from './Table';
import { type DatabaseInfo } from '../../../../hooks';
import { type CustomPanelProps, Panel } from '../../Panel';

export const ReplicatorPanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  const interval = database?.dataStats?.meta?.rateAverageOverSeconds
    ? ` (${database?.dataStats?.meta?.rateAverageOverSeconds}s)`
    : '';

  const replicatorStats = database?.dataStats?.replicator;
  const rows: TableProps['rows'] = [
    ['μ', `recv ${interval}`, replicatorStats?.receivedMessages?.countPerSecond ?? 0, 'op/s'],
    ['μ', 'recv size', K(replicatorStats?.receivedMessages?.payloadSize), 'KB'],

    ['μ', `send ${interval}`, replicatorStats?.sentMessages?.countPerSecond ?? 0, 'op/s'],
    ['μ', 'sent size', K(replicatorStats?.sentMessages?.payloadSize), 'KB'],
    ['μ', 'send failures', replicatorStats?.sentMessages?.failedPerSecond ?? 0, 'err/s'],
    ['μ', 'send duration', replicatorStats?.sentMessages?.opDuration ?? 0, 'ms'],
  ];

  return (
    <Panel
      {...props}
      icon='ph--database--regular'
      title='DB replicator'
      info={<div className='flex items-center gap-2'>{replicatorStats?.connections ?? 0} Connection(s)</div>}
    >
      <Table rows={rows} />
    </Panel>
  );
};
