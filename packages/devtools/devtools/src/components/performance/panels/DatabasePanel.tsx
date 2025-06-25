//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type DatabaseInfo } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';

const formatNumber = (n?: number, d = 1, p = 2) => ((n ?? 0) / d).toFixed(p);

export const DatabasePanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  const windowLengthSuffix = database?.dataStats?.meta?.rateAverageOverSeconds
    ? ` [${database?.dataStats?.meta?.rateAverageOverSeconds}s]`
    : '';

  const storageStats = database?.dataStats?.storage;
  const info: [string, string, string?][] = [
    ['Objects', formatNumber(database?.objects)],
    ['Documents', formatNumber(database?.documents)],
    ['Documents (syncing)', formatNumber(database?.documentsToReconcile)],

    [`μ read rate ${windowLengthSuffix}`, `${formatNumber(storageStats?.reads?.countPerSecond)}`, 'op/s'],
    ['μ read duration', `${formatNumber(storageStats?.reads?.opDuration)}`, 'ms'],
    ['μ read chunk size', `${formatNumber(storageStats?.reads?.payloadSize, 1024)}`, 'K'],

    [`μ write rate ${windowLengthSuffix}`, `${formatNumber(storageStats?.writes?.countPerSecond)}`, 'op/s'],
    ['μ write duration', `${formatNumber(storageStats?.writes?.opDuration)}`, 'ms'],
    ['μ write chunk size', `${formatNumber(storageStats?.writes?.payloadSize, 1024)}`, 'K'],
  ];
  return (
    <Panel
      {...props}
      icon='ph--database--regular'
      title='Database'
      info={
        <div className='flex items-center gap-2'>
          <div className='flex gap-1'>
            {formatNumber(database?.spaces, 1, 0)}
            <span>space(s)</span>
          </div>
        </div>
      }
    >
      <div className='w-full grid grid-cols-[2fr_1fr_min-content] text-xs font-mono'>
        {info.map(([entity, quantity, unit], i) => (
          <div key={i} className='grid grid-cols-subgrid col-span-3'>
            <div className='p-1 truncate'>{entity}</div>
            <div className='p-1 text-right'>{quantity}</div>
            <div className='p-1 text-subdued'>{unit}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
};
