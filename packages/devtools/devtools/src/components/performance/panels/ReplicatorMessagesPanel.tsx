//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type EchoDataStats } from '@dxos/echo-pipeline';

import { type DatabaseInfo } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';

type CountsByMessage = EchoDataStats['replicator']['countByMessage'];

type MessageSummary = {
  direction: 'in' | 'out';
  type: string;
  quantity: string;
};

export const ReplicatorMessagesPanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  const replicatorStats = database?.dataStats?.replicator;
  let receivedTotal = 0;
  let sentTotal = 0;
  const entries: MessageSummary[] = Object.entries(replicatorStats?.countByMessage ?? ({} as CountsByMessage))
    .flatMap(([type, counts]) => {
      sentTotal += counts.sent;
      receivedTotal += counts.received;
      const avgMessageSize = replicatorStats?.avgSizeByMessage[type];
      const sizeString = avgMessageSize !== undefined ? ` (${formatNumber(avgMessageSize)} bytes)` : '';
      return [
        { direction: 'in', type, quantity: `${formatNumber(counts.received)}${sizeString}` },
        { direction: 'out', type, quantity: `${formatNumber(counts.sent)}${sizeString}` },
      ] as MessageSummary[];
    })
    .sort((m1, m2) => {
      const cmp = m1.type.localeCompare(m2.type);
      return cmp === 0 ? m1.direction.localeCompare(m2.direction) : cmp;
    });

  return (
    <Panel
      {...props}
      icon='ph--database--regular'
      title='DB messages'
      info={
        <div className='flex gap-1 items-center'>
          <span>
            <span>{formatNumber(receivedTotal)}</span>
            <span className='text-green-500' title='Received'>
              ↓
            </span>
          </span>
          <span>
            <span>{formatNumber(sentTotal)}</span>
            <span className='text-orange-500' title='Sent'>
              ↑
            </span>
          </span>
        </div>
      }
    >
      <table className='table-auto w-full text-xs font-mono'>
        <tbody>
          {entries.map(({ direction, type, quantity }, i) => (
            <tr key={i}>
              <td className='p-1 text-left'>{direction}</td>
              <td className='p-1 truncate text-center'>{type}</td>
              <td className='p-1 truncate text-right'>{quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
};

const formatNumber = (n?: number) => (n ?? 0).toLocaleString();
