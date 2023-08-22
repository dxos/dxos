//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { defaultGridSlots, Grid, GridColumnDef } from '@dxos/aurora-grid';

import { JsonView } from './JsonView';

export type MasterTableProps<T extends {}> = {
  columns: GridColumnDef<T>[];
  data: T[];
  pinToBottom?: boolean;
};

export const MasterDetailTable = <T extends {}>({ columns, data, pinToBottom }: MasterTableProps<T>) => {
  const [selected, setSelected] = useState<T[]>();

  return (
    <div className='flex grow overflow-hidden divide-x'>
      <div className='flex w-1/2 overflow-hidden'>
        <Grid<T>
          columns={columns}
          data={data}
          selected={selected}
          onSelectedChange={setSelected}
          slots={defaultGridSlots}
          pinToBottom={pinToBottom}
        />
      </div>

      <div className='flex w-1/2 overflow-auto'>{selected && <JsonView data={selected?.[0]} />}</div>
    </div>
  );
};
