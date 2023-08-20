//
// Copyright 2023 DXOS.org
//

import defaultsdeep from 'lodash.defaultsdeep';
import React, { useState } from 'react';

import { defaultGridSlots, Grid, GridColumn } from '@dxos/aurora-grid';
import { TableSlots } from '@dxos/mosaic';

import { JsonView } from './JsonView';

export type MasterTableProps<T extends {}> = {
  columns: GridColumn<T>[];
  data: T[];
  slots?: TableSlots;
  compact?: boolean;
};

export const MasterDetailTable = <T extends {}>({ columns, data, slots }: MasterTableProps<T>) => {
  const [selected, setSelected] = useState<T>();
  const tableSlots = defaultsdeep({}, slots, {
    root: { className: 'grow' },
    selected: { className: 'bg-slate-200' },
    cell: { className: 'cursor-pointer' },
  });

  // TODO(burdon): id accessor.
  return (
    <div className='flex grow overflow-hidden divide-x'>
      <div className='flex w-1/2 overflow-hidden'>
        <Grid<T>
          id={'key'}
          columns={columns}
          data={data}
          slots={defaultGridSlots}
          onSelect={(selected) => data.find((item) => !!item)}
        />
      </div>

      <div className='flex w-1/2 overflow-auto'>{selected && <JsonView data={selected} />}</div>
    </div>
  );
};
