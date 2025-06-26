//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { formatNumber, Table, type TableProps } from './Table';
import { type DatabaseInfo } from '../../../../hooks';
import { type CustomPanelProps, Panel } from '../../Panel';

export const DatabasePanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  const windowLengthSuffix = database?.dataStats?.meta?.rateAverageOverSeconds
    ? ` [${database?.dataStats?.meta?.rateAverageOverSeconds}s]`
    : '';

  const storageStats = database?.dataStats?.storage;

  const rows: TableProps['rows'] = [
    ['#', 'objects', formatNumber(database?.objects, 1, 0)],
    ['#', 'documents', formatNumber(database?.documents, 1, 0)],
    ['#', 'documents (syncing)', formatNumber(database?.documentsToReconcile, 1, 0)],

    ['μ', `read rate ${windowLengthSuffix}`, `${formatNumber(storageStats?.reads?.countPerSecond)}`, 'op/s'],
    ['μ', 'read duration', `${formatNumber(storageStats?.reads?.opDuration)}`, 'ms'],
    ['μ', 'read chunk size', `${formatNumber(storageStats?.reads?.payloadSize, 1000)}`, 'k'],

    ['μ', `write rate ${windowLengthSuffix}`, `${formatNumber(storageStats?.writes?.countPerSecond)}`, 'op/s'],
    ['μ', 'write duration', `${formatNumber(storageStats?.writes?.opDuration)}`, 'ms'],
    ['μ', 'write chunk size', `${formatNumber(storageStats?.writes?.payloadSize, 1000)}`, 'k'],
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
            <span>Space(s)</span>
          </div>
        </div>
      }
    >
      <Table rows={rows} />
    </Panel>
  );
};
