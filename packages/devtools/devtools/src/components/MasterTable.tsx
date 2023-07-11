//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { TableColumn, Table, TableSlots } from '@dxos/mosaic';

import { JsonView } from './JsonView';

export type MasterTableProps<T extends {}> = {
  columns: TableColumn<T>[];
  data: T[];
  slots?: TableSlots;
};

// TODO(burdon): Create storybook.
export const MasterTable = <T extends {}>({ columns, data, slots }: MasterTableProps<T>) => {
  const [selected, setSelected] = useState<T>();

  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex w-1/2 overflow-hidden border-r'>
        <Table<T> columns={columns} data={data} slots={slots} selected={selected} onSelect={setSelected} />
      </div>

      <div className='flex w-1/2 overflow-hidden ml-2 mt-2'>
        {selected && <JsonView className='flex overflow-auto' data={selected} />}
      </div>
    </div>
  );
};
