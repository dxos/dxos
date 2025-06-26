//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { formatNumber, Table, type TableProps } from './Table';
import { type DatabaseInfo } from '../../../../hooks';
import { type CustomPanelProps, Panel } from '../../Panel';

export const ReplicatorPanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  const windowLengthSuffix = database?.dataStats?.meta?.rateAverageOverSeconds
    ? ` [${database?.dataStats?.meta?.rateAverageOverSeconds}s]`
    : '';
  const replicatorStats = database?.dataStats?.replicator;

  const rows: TableProps['rows'] = [
    ['μ', `recv ${windowLengthSuffix}`, formatNumber(replicatorStats?.receivedMessages?.countPerSecond), 'op/s'],
    ['μ', 'recv size', formatNumber(replicatorStats?.receivedMessages?.payloadSize, 1000), 'k'],

    ['μ', `send ${windowLengthSuffix}`, formatNumber(replicatorStats?.sentMessages?.countPerSecond), 'op/s'],
    ['μ', 'sent size', formatNumber(replicatorStats?.sentMessages?.payloadSize, 1000), 'k'],
    ['μ', `send failures ${windowLengthSuffix}`, formatNumber(replicatorStats?.sentMessages?.failedPerSecond), 'err/s'],
    ['μ', 'send duration', formatNumber(replicatorStats?.sentMessages?.opDuration), 'ms'],
  ];

  return (
    <Panel
      {...props}
      icon='ph--database--regular'
      title='DB replicator'
      info={
        <div className='flex gap-1'>
          {formatNumber(replicatorStats?.connections, 1, 0)}
          <span>Connection(s)</span>
        </div>
      }
    >
      <Table rows={rows} />
    </Panel>
  );
};
