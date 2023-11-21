//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { AnchoredOverflow } from '@dxos/react-ui';
import { Table, type TableColumnDef } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

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
  const [selected, setSelected] = useState<T>();

  return (
    <div className='flex grow overflow-hidden divide-x'>
      {pinToBottom ? (
        <AnchoredOverflow.Root classNames={widths[0]}>
          <Table<T>
            columns={columns}
            data={data}
            rowsSelectable
            currentDatum={selected}
            onDatumClick={setSelected}
            fullWidth
          />
          <AnchoredOverflow.Anchor />
        </AnchoredOverflow.Root>
      ) : (
        <div className={mx('overflow-auto', widths[0])}>
          <Table<T>
            columns={columns}
            data={data}
            rowsSelectable
            currentDatum={selected}
            onDatumClick={setSelected}
            fullWidth
          />
        </div>
      )}
      <div className={mx('flex overflow-auto', widths[1])}>{selected && <JsonView data={selected} />}</div>
    </div>
  );
};
