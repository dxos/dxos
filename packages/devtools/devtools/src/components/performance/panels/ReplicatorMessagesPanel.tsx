//
// Copyright 2024 DXOS.org
//

import { Database } from '@phosphor-icons/react';
import React from 'react';

import { type DatabaseInfo } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';

export const ReplicatorMessagesPanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  const replicatorStats = database?.dataStats?.replicator;
  let receivedTotal = 0;
  let sentTotal = 0;
  const entries: [string, string, string][] = Object.entries(replicatorStats?.countByMessageType ?? ({} as any))
    .flatMap(([type, counts]) => {
      sentTotal += counts.sent;
      receivedTotal += counts.received;
      const avgMessageSize = replicatorStats?.avgSizeByMessageType[type];
      const sizeString = avgMessageSize !== undefined ? ` (${formatNumber(avgMessageSize)} bytes)` : '';
      return [
        ['in', type, `${formatNumber(counts.received)}${sizeString}`],
        ['out', type, `${formatNumber(counts.sent)}${sizeString}`],
      ];
    })
    .sort((e1, e2) => e1[0].localeCompare(e2[0]));
  return (
    <Panel
      {...props}
      icon={Database}
      title='Database replicator messages'
      info={`last ${formatNumber(receivedTotal)}-in & ${formatNumber(sentTotal)}-out`}
    >
      <table className='table-auto w-full text-xs font-mono'>
        <tbody>
          {entries.map(([direction, type, quantity], i) => (
            <tr key={i}>
              <td className='p-1 text-left'>{direction}</td>
              <td className='p-1 text-center overflow-hidden'>{type}</td>
              <td className='p-1 text-right'>{quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
};

const formatNumber = (n?: number) => (n ?? 0).toLocaleString();
