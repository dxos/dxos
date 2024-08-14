//
// Copyright 2024 DXOS.org
//

import { Database } from '@phosphor-icons/react';
import React from 'react';

import { type DatabaseInfo } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';

export const DatabasePanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  const windowLengthSuffix = database?.dataStats?.meta?.rateAverageOverSeconds
    ? ` [${database?.dataStats?.meta?.rateAverageOverSeconds}s]`
    : '';
  const storageStats = database?.dataStats?.storage;
  const info: [string, string][] = [
    ['Objects', formatNumber(database?.objects)],
    ['Documents', `${formatNumber(database?.documents)} (${formatNumber(database?.documentsToReconcile)} to sync)`],

    [`Avg. storage read rate${windowLengthSuffix}`, `${formatNumber(storageStats?.reads?.countPerSecond)} op/s`],
    ['Avg. read duration', `${formatNumber(storageStats?.reads?.opDuration)} ms`],
    ['Avg. read chunk size', `${formatNumber(storageStats?.reads?.payloadSize)} bytes`],

    [`Avg. storage write rate${windowLengthSuffix}`, `${formatNumber(storageStats?.writes?.countPerSecond)} op/s`],
    ['Avg. write duration', `${formatNumber(storageStats?.writes?.opDuration)} ms`],
    ['Avg. written chunk size', `${formatNumber(storageStats?.writes?.payloadSize)} bytes`],
  ];
  return (
    <Panel
      {...props}
      icon={Database}
      title='Database'
      info={
        <div className='flex items-center gap-2'>
          <div className='flex gap-1'>
            {formatNumber(database?.spaces)}
            <span>space(s)</span>
          </div>
        </div>
      }
    >
      <table className='table-auto w-full text-xs font-mono'>
        <tbody>
          {info.map(([entity, quantity], i) => (
            <tr key={i}>
              <td className='p-1 overflow-hidden'>{entity}</td>
              <td className='p-1 text-right'>{quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
};

const formatNumber = (n?: number) => (n ?? 0).toLocaleString();
