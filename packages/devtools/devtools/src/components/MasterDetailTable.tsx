//
// Copyright 2023 DXOS.org
//

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

// TODO(burdon): Slots (ref for LoggingPanel).
export const MasterDetailTable = <T extends {}>({ columns, data, slots }: MasterTableProps<T>) => {
  const [selected, setSelected] = useState<T>();
  const handleSelected = (selected: any, item: T) => {
    setSelected(item);
  };

  return (
    <div className='flex grow overflow-hidden divide-x'>
      <div className='flex w-1/2 overflow-hidden'>
        <Grid<T> columns={columns} data={data} slots={defaultGridSlots} onSelect={handleSelected} />
      </div>

      <div className='flex w-1/2 overflow-auto'>{selected && <JsonView data={selected} />}</div>
    </div>
  );
};
