//
// Copyright 2023 DXOS.org
//

import defaultsdeep from 'lodash.defaultsdeep';
import React, { useState } from 'react';

import { TableColumn, Table, TableSlots } from '@dxos/mosaic';

import { JsonView } from './JsonView';

export type MasterTableProps<T extends {}> = {
  columns: TableColumn<T>[];
  data: T[];
  slots?: TableSlots;
  compact?: boolean;
};

export const MasterDetailTable = <T extends {}>({ columns, data, slots, compact = true }: MasterTableProps<T>) => {
  const [selected, setSelected] = useState<T>();
  const tableSlots = defaultsdeep({}, slots, {
    selected: { className: 'bg-slate-200' },
    cell: { className: 'cursor-pointer' },
  });

  return (
    <div className='flex flex-1 overflow-hidden divide-x'>
      <div className='flex w-1/2 overflow-hidden'>
        <Table<T>
          compact={compact}
          columns={columns}
          data={data}
          slots={tableSlots}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <div className='flex w-1/2 overflow-hidden'>{selected && <JsonView data={selected} />}</div>
    </div>
  );
};
