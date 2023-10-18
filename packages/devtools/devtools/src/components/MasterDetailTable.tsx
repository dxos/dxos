//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Table, type TableColumnDef } from '@dxos/aurora-table';
import { mx } from '@dxos/aurora-theme';

import { JsonView } from './JsonView';

export type MasterTableProps<T extends {}> = {
  columns: TableColumnDef<T>[];
  data: T[];
  pinToBottom?: boolean;
  widths?: string[];
};

export const MasterDetailTable = <T extends {}>({
  columns,
  data,
  pinToBottom,
  widths = ['w-1/2', 'w-1/2'],
}: MasterTableProps<T>) => {
  const [selected, setSelected] = useState<T[]>();

  return (
    <div className='flex grow overflow-hidden divide-x'>
      <div className={mx('flex overflow-hidden', widths[0])}>
        <Table<T>
          columns={columns}
          data={data}
          selected={selected}
          onSelectedChange={setSelected}
          pinToBottom={pinToBottom}
        />
      </div>

      <div className={mx('flex overflow-auto', widths[1])}>{selected && <JsonView data={selected?.[0]} />}</div>
    </div>
  );
};
