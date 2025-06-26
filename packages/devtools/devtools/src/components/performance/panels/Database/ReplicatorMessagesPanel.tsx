//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type EchoDataStats } from '@dxos/echo-pipeline';

import { formatNumber, Table, type TableProps } from './Table';
import { type DatabaseInfo } from '../../../../hooks';
import { type CustomPanelProps, Panel } from '../../Panel';

type CountsByMessage = EchoDataStats['replicator']['countByMessage'];

export const ReplicatorMessagesPanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  let recvTotal = 0;
  let sentTotal = 0;

  const replicatorStats = database?.dataStats?.replicator;
  const rows: TableProps['rows'] = Object.entries(replicatorStats?.countByMessage ?? ({} as CountsByMessage))
    .flatMap(([type, counts]) => {
      sentTotal += counts.sent;
      recvTotal += counts.received;

      const avgSize = replicatorStats?.avgSizeByMessage[type];
      const size = avgSize !== undefined ? ` (${formatNumber(avgSize, 1000)} k)` : '';

      return [
        ['↑', type + size, formatNumber(counts.sent, 1, 0)],
        ['↓', type + size, formatNumber(counts.received, 1, 0)],
      ];
    })
    .sort(([d1, t1], [d2, t2]) => {
      const cmp = d1.localeCompare(d2);
      return cmp === 0 ? t1.localeCompare(t2) : cmp;
    });

  return (
    <Panel
      {...props}
      icon='ph--database--regular'
      title='DB messages'
      info={
        <div className='flex gap-1 items-center'>
          <span>
            <span>{formatNumber(recvTotal, 1, 0)}</span>
            <span className='text-green-500' title='Received'>
              ↓
            </span>
          </span>
          <span>
            <span>{formatNumber(sentTotal, 1, 0)}</span>
            <span className='text-orange-500' title='Sent'>
              ↑
            </span>
          </span>
        </div>
      }
    >
      <Table rows={rows} />
    </Panel>
  );
};
