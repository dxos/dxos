//
// Copyright 2023 DXOS.org
//

import { flexRender, type HeaderGroup, type RowData } from '@tanstack/react-table';
import React from 'react';

import { type TableProps } from './Table';
import { tfootRoot, tfootTr, tfootTh } from '../../theme';

export type TableFooterProps<TData extends RowData> = Partial<TableProps<TData>> & {
  footers: HeaderGroup<TData>[];
  expand?: boolean;
};

export const TableFooter = <TData extends RowData>(props: TableFooterProps<TData>) => {
  const { footers, expand, debug } = props;
  return (
    <tfoot className={tfootRoot(props)}>
      {footers.map((footerGroup) => (
        <tr key={footerGroup.id} className={tfootTr(props)}>
          {debug && <th />}

          {footerGroup.headers.map((footer) => {
            return (
              <th key={footer.id} className={tfootTh(props, footer.column.columnDef.meta?.slots?.footer?.className)}>
                {footer.isPlaceholder ? null : flexRender(footer.column.columnDef.footer, footer.getContext())}
              </th>
            );
          })}

          {expand && <th />}
        </tr>
      ))}
    </tfoot>
  );
};
