//
// Copyright 2023 DXOS.org
//

import React, { useRef, useState } from 'react';

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

  const TableContainer = pinToBottom ? AnchoredOverflow.Root : 'div';
  const tableContainerStyles = pinToBottom ? { classNames: widths[0] } : { className: mx('overflow-auto', widths[0]) };

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className='flex grow overflow-hidden divide-x'>
      <TableContainer {...tableContainerStyles} ref={containerRef}>
        <Table<T>
          columns={columns}
          data={data}
          rowsSelectable
          currentDatum={selected}
          onDatumClick={setSelected}
          fullWidth
          getScrollElement={() => containerRef.current}
        />
        {pinToBottom && <AnchoredOverflow.Anchor />}
      </TableContainer>
      <div className={mx('flex overflow-auto', widths[1])}>{selected && <JsonView data={selected} />}</div>
    </div>
  );
};
