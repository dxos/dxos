//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';
import { Column } from 'react-table';

import { Item } from '@dxos/client';
import { Table } from '@dxos/kai';

import { JsonView } from './JsonView';

export type MasterTableProps<T extends Item> = {
  columns: Column<T>[];
  data: T[];
};

// TODO(burdon): Create storybook.
export const MasterTable = <T,>({ columns, data }: MasterTableProps<any>) => {
  const [selected, setSelected] = useState<string>();

  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex w-1/2 overflow-hidden border-r'>
        <Table<T> columns={columns} data={data} selected={selected} onSelect={setSelected} />
      </div>

      <div className='flex w-1/2 overflow-hidden'>{selected && <JsonView data={selected} />}</div>
    </div>
  );
};
