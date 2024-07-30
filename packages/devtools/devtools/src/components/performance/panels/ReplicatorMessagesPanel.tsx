//
// Copyright 2024 DXOS.org
//

import { Database } from '@phosphor-icons/react';
import React from 'react';

import { type EchoDataStats } from '@dxos/echo-db';

import { type DatabaseInfo } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';

type CountsByMessageType = EchoDataStats['replicator']['countByMessageType'];

type MessageTypeSummary = {
  direction: 'in' | 'out';
  type: string;
  quantity: string;
};

export const ReplicatorMessagesPanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  const replicatorStats = database?.dataStats?.replicator;
  let receivedTotal = 0;
  let sentTotal = 0;
  const entries: MessageTypeSummary[] = Object.entries(
    replicatorStats?.countByMessageType ?? ({} as CountsByMessageType),
  )
    .flatMap(([type, counts]) => {
      sentTotal += counts.sent;
      receivedTotal += counts.received;
      const avgMessageSize = replicatorStats?.avgSizeByMessageType[type];
      const sizeString = avgMessageSize !== undefined ? ` (${formatNumber(avgMessageSize)} bytes)` : '';
      return [
        { direction: 'in', type, quantity: `${formatNumber(counts.received)}${sizeString}` },
        { direction: 'out', type, quantity: `${formatNumber(counts.sent)}${sizeString}` },
      ] as MessageTypeSummary[];
    })
    .sort((m1, m2) => {
      const cmp = m1.type.localeCompare(m2.type);
      return cmp === 0 ? m1.direction.localeCompare(m2.direction) : cmp;
    });
  return (
    <Panel
      {...props}
      icon={Database}
      title='Database replicator messages'
      info={
        <span>
          last {formatNumber(receivedTotal)}-in & {formatNumber(sentTotal)}-out
        </span>
      }
    >
      <table className='table-auto w-full text-xs font-mono'>
        <tbody>
          {entries.map(({ direction, type, quantity }, i) => (
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
