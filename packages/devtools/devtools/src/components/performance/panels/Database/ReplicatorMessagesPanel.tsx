//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type EchoDataStats } from '@dxos/echo-pipeline';

import { type DatabaseInfo } from '../../../../hooks';
import { type CustomPanelProps, Panel } from '../../Panel';
import { Table, Unit } from '../Table';

type CountsByMessage = EchoDataStats['replicator']['countByMessage'];

type Data = [string, string, number];

export const ReplicatorMessagesPanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  let recvTotal = 0;
  let sentTotal = 0;

  const replicatorStats = database?.dataStats?.replicator;
  const rows: Data[] = Object.entries(replicatorStats?.countByMessage ?? ({} as CountsByMessage))
    .flatMap<Data>(([type, counts]) => {
      sentTotal += counts.sent;
      recvTotal += counts.received;

      const avgSize = replicatorStats?.avgSizeByMessage[type];
      const size = avgSize !== undefined ? ` (${Unit.KB(avgSize)} KB)` : '';

      return [
        ['↑', type + size, counts.sent],
        ['↓', type + size, counts.received],
      ] as Data[];
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
            <span>{recvTotal}</span>
            <span className='text-green-500' title='Received'>
              ↓
            </span>
          </span>
          <span>
            <span>{sentTotal}</span>
            <span className='text-orange-500' title='Sent'>
              ↑
            </span>
          </span>
        </div>
      }
      maxHeight={0}
    >
      <Table rows={rows} />
    </Panel>
  );
};
