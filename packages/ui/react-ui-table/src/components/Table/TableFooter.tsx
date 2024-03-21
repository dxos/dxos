//
// Copyright 2023 DXOS.org
//

import { flexRender } from '@tanstack/react-table';
import React from 'react';

import { useTableContext } from './TableContext';
import { tfootRoot, tfootTr, tfootTh } from '../../theme';

type TableFooterProps = {};

const TABLE_FOOT_NAME = 'TableFooter';

const TableFooter = (props: TableFooterProps) => {
  const tableContext = useTableContext();
  const { table, expand, debug } = tableContext;
  const footers = table.getFooterGroups();

  return (
    <tfoot className={tfootRoot(props)}>
      {footers.map((footerGroup) => (
        <tr key={footerGroup.id} className={tfootTr(tableContext)}>
          {debug && <th />}

          {footerGroup.headers.map((footer) => {
            return (
              <th key={footer.id} className={tfootTh(tableContext, footer.column.columnDef.meta?.footer?.classNames)}>
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

TableFooter.displayName = TABLE_FOOT_NAME;

export { TableFooter };

export type { TableFooterProps };
