//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { K, Table, type TableProps } from './Table';
import { type DatabaseInfo } from '../../../../hooks';
import { type CustomPanelProps, Panel } from '../../Panel';

export const DatabasePanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  const interval = database?.dataStats?.meta?.rateAverageOverSeconds
    ? ` (${database?.dataStats?.meta?.rateAverageOverSeconds}s)`
    : '';

  const storageStats = database?.dataStats?.storage;
  const rows: TableProps['rows'] = [
    ['#', 'objects', database?.objects ?? 0],
    ['#', 'documents', database?.documents ?? 0],
    ['#', 'documents (syncing)', database?.documentsToReconcile ?? 0],

    ['μ', `read rate ${interval}`, storageStats?.reads?.countPerSecond ?? 0, 'op/s'],
    ['μ', 'read duration', storageStats?.reads?.opDuration ?? 0, 'ms'],
    ['μ', 'read chunk size', K(storageStats?.reads?.payloadSize), 'KB'],

    ['μ', `write rate ${interval}`, storageStats?.writes?.countPerSecond ?? 0, 'op/s'],
    ['μ', 'write duration', storageStats?.writes?.opDuration ?? 0, 'ms'],
    ['μ', 'write chunk size', K(storageStats?.writes?.payloadSize), 'KB'],
  ];

  return (
    <Panel
      {...props}
      icon='ph--database--regular'
      title='Database'
      info={<div className='flex items-center gap-2'>{database?.spaces ?? 0} Space(s)</div>}
    >
      <Table rows={rows} />
    </Panel>
  );
};
