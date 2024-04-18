//
// Copyright 2024 DXOS.org
//

import { type Row, type Table } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';

export const usePinLastRow = (
  pinLastRow: boolean | undefined,
  table: Table<any>,
  data: any[],
  getScrollElement?: () => Element | null,
) => {
  const [pinnedRowKey, setPinnedRowKey] = useState<string>();

  // Scrolls to the bottom of a scrollable element.
  const scrollToBottom = useCallback(() => {
    const scrollElement = getScrollElement?.();
    if (scrollElement) {
      requestAnimationFrame(() => scrollElement.scrollTo({ top: scrollElement.scrollHeight }));
    }
  }, [getScrollElement]);

  const pinRow = useCallback(
    (rowToPin: Row<any>) => {
      table.resetRowPinning();
      rowToPin.pin('bottom');
      setPinnedRowKey(rowToPin.id);
    },
    [table],
  );

  const clearRowPinning = useCallback(() => {
    table.resetRowPinning();
    setPinnedRowKey(undefined);
  }, [table]);

  // Define the logic for pinning the last row in a callback.
  const pinLastRowCallback = useCallback(() => {
    const rows = table.getRowModel().rows;

    if (rows.length === 0) {
      return clearRowPinning();
    }

    const lastRow = rows[rows.length - 1];
    if (lastRow.id === pinnedRowKey) {
      return;
    }

    pinRow(lastRow);

    if (pinnedRowKey !== undefined) {
      scrollToBottom();
    }
  }, [table, scrollToBottom, pinnedRowKey]);

  // Effect to handle pinning logic when data changes.
  useEffect(() => {
    if (pinLastRow) {
      pinLastRowCallback();
    }
  }, [data, pinLastRow, pinLastRowCallback]);
};
