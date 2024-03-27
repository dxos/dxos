//
// Copyright 2024 DXOS.org
//

import { type Table } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

export const usePinLastRow = (
  pinLastRow: boolean | undefined,
  table: Table<any>,
  data: any,
  getScrollElement?: () => Element | null,
) => {
  const [pinnedRowKey, setPinnedRowKey] = useState<string>();

  useEffect(() => {
    if (!pinLastRow) {
      return;
    }

    const rows = table.getRowModel().rows;
    const rowToPin = rows[rows.length - 1];
    const rowId = rowToPin.id;

    if (rowId === pinnedRowKey) {
      return;
    }

    table.resetRowPinning();
    rowToPin.pin('bottom');

    const scrollElement = getScrollElement?.();
    const isFirstRender = pinnedRowKey === undefined;
    if (scrollElement && !isFirstRender) {
      requestAnimationFrame(() => {
        scrollElement.scrollTo({ top: scrollElement.scrollHeight });
      });
    }

    setPinnedRowKey(rowId);
  }, [pinLastRow, table, getScrollElement, pinnedRowKey, setPinnedRowKey, data]);
};
