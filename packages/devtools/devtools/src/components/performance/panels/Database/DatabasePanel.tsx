//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type DatabaseInfo } from '../../../../hooks/index.ts';
import { type CustomPanelProps, Panel } from '../../Panel.tsx';
import { Table, type TableProps, Unit } from '../Table.tsx';

export const DatabasePanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  const interval = database?.dataStats?.meta?.rateAverageOverSeconds
    ? ` (${database?.dataStats?.meta?.rateAverageOverSeconds}s)`
    : '';

  const storageStats = database?.dataStats?.storage;
  const rows: TableProps['rows'] = [
    // Storage census (`db.stats()`), summed across open spaces.
    ['#', 'objects', database?.objects?.alive ?? 0],
    ['#', 'objects (deleted)', database?.objects?.deleted ?? 0],
    ['#', 'documents', database?.storedDocuments ?? 0],
    ['#', 'feeds', database?.feeds?.count ?? 0],
    ['#', 'feed blocks', database?.feeds?.blocks ?? 0],

    // Runtime counts — resident handles and replication backlog, not what is on disk.
    ['#', 'documents (loaded)', database?.documents ?? 0],
    ['#', 'documents (syncing)', database?.documentsToReconcile ?? 0],

    ['μ', `read rate ${interval}`, storageStats?.reads?.countPerSecond ?? 0, 'op/s'],
    ['μ', 'read duration', storageStats?.reads?.opDuration ?? 0, 'ms'],
    ['μ', 'read chunk size', Unit.KB(storageStats?.reads?.payloadSize), 'KB'],

    ['μ', `write rate ${interval}`, storageStats?.writes?.countPerSecond ?? 0, 'op/s'],
    ['μ', 'write duration', storageStats?.writes?.opDuration ?? 0, 'ms'],
    ['μ', 'write chunk size', Unit.KB(storageStats?.writes?.payloadSize), 'KB'],
  ];

  return (
    <Panel
      {...props}
      icon='ph--database--regular'
      title='Database'
      info={<div className='flex items-center gap-2'>{database?.spaces ?? 0} Space(s)</div>}
      maxHeight={0}
    >
      <Table rows={rows} />
    </Panel>
  );
};
