//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { AnchoredOverflow } from '@dxos/react-ui';
import { Table, type TableColumnDef } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

import { JsonView } from './JsonView';
import { styles } from '../styles';

export type MasterTableProps<T extends {}> = {
  columns: TableColumnDef<T>[];
  data: T[];
  pinToBottom?: boolean;
  statusBar?: React.ReactNode;
  detailsTransform?: (data: T) => any;
  detailsPosition?: 'bottom' | 'right';
};

export const MasterDetailTable = <T extends {}>({
  columns,
  data,
  pinToBottom,
  statusBar,
  detailsTransform,
  detailsPosition = 'bottom',
}: MasterTableProps<T>) => {
  const [selected, setSelected] = useState<T>();

  const TableContainer = pinToBottom ? AnchoredOverflow.Root : 'div';
  const containerStyles = detailsPosition === 'right' ? 'flex-row divide-x' : 'flex-col divide-y';
  const tableContainerStyles = pinToBottom ? '' : 'overflow-auto' + detailsPosition === 'right' ? ' w-1/2' : ' h-1/2';
  const detailsContainerStyles = detailsPosition === 'right' ? 'w-1/2' : 'h-1/2';

  return (
    <>
      <div className={mx('flex grow', containerStyles, 'overflow-hidden', styles.border)}>
        <Table.Root>
          <Table.Viewport asChild>
            <TableContainer className={tableContainerStyles}>
              <Table.Main<T>
                columns={columns}
                data={data}
                rowsSelectable
                currentDatum={selected}
                onDatumClick={setSelected}
                fullWidth
              />
              {pinToBottom && <AnchoredOverflow.Anchor />}
            </TableContainer>
          </Table.Viewport>
        </Table.Root>

        <div className={mx('flex overflow-auto', detailsContainerStyles)}>
          {selected ? (
            <JsonView data={detailsTransform !== undefined ? detailsTransform(selected) : selected} />
          ) : (
            'Details'
          )}
        </div>
      </div>
      {statusBar && (
        <div
          className={mx(
            'bs-[--statusbar-size]',
            'flex justify-end items-center gap-2',
            'surface-base fg-description',
            'border-bs separator-separator',
            'text-lg pointer-fine:text-xs',
          )}
        >
          {statusBar}
        </div>
      )}
    </>
  );
};
