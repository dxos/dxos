//
// Copyright 2024 DXOS.org
//

import { Database } from '@phosphor-icons/react';
import React from 'react';

import { type DatabaseInfo } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';

export const ReplicatorPanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  const windowLengthSuffix = database?.dataStats?.meta?.rateAverageOverSeconds
    ? ` [${database?.dataStats?.meta?.rateAverageOverSeconds}s]`
    : '';
  const replicatorStats = database?.dataStats?.replicator;
  const info: [string, string][] = [
    [
      `Avg. message receive rate${windowLengthSuffix}`,
      `${formatNumber(replicatorStats?.receivedMessages?.countPerSecond)} op/s`,
    ],
    ['Avg. received message size', `${formatNumber(replicatorStats?.receivedMessages?.payloadSize)} bytes`],

    [
      `Avg. message send rate${windowLengthSuffix}`,
      `${formatNumber(replicatorStats?.sentMessages?.countPerSecond)} op/s`,
    ],
    [
      `Avg. message send failure rate${windowLengthSuffix}`,
      `${formatNumber(replicatorStats?.sentMessages?.failedPerSecond)} times/s`,
    ],
    ['Avg. message send duration', `${formatNumber(replicatorStats?.sentMessages?.opDuration)} ms`],
    ['Avg. sent message size', `${formatNumber(replicatorStats?.sentMessages?.payloadSize)} bytes`],
  ];
  return (
    <Panel
      {...props}
      icon={Database}
      title='Database replicator'
      info={
        <div className='flex gap-1'>
          {formatNumber(replicatorStats?.connections)}
          <span>connection(s)</span>
        </div>
      }
    >
      <table className='w-full table-auto font-mono text-xs'>
        <tbody>
          {info.map(([entity, quantity], i) => (
            <tr key={i}>
              <td className='overflow-hidden p-1'>{entity}</td>
              <td className='p-1 text-right'>{quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
};

const formatNumber = (n?: number) => (n ?? 0).toLocaleString();
