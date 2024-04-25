//
// Copyright 2024 DXOS.org
//

import { useVirtualizer } from '@tanstack/react-virtual';
import type React from 'react';
import { createContext, useState } from 'react';

type TableRootContextActions =
  | { type: 'updateScrollContextRef'; ref: React.RefObject<HTMLDivElement> }
  | { type: 'updateTableCount'; count: number };

export const useTableRootContext = (initialRef?: React.RefObject<HTMLDivElement>) => {
  const [scrollContextRef, setScrollContextRef] = useState(initialRef);
  const [tableCount, setTableCount] = useState(0);

  const virtualizer = useVirtualizer({
    getScrollElement: () => scrollContextRef?.current ?? null,
    count: tableCount,
    overscan: 8,
    estimateSize: () => 40,
  });

  const dispatch = (action: TableRootContextActions) => {
    switch (action.type) {
      case 'updateScrollContextRef':
        setScrollContextRef(action.ref);
        break;

      case 'updateTableCount':
        setTableCount(action.count);
        break;

      default:
        break;
    }
  };

  return { scrollContextRef, virtualizer, dispatch };
};

export type TableRootContextValue = ReturnType<typeof useTableRootContext>;

// Create the context without a default value.
// The expectation is that the provider will always supply a value, so no need to define a default here.
export const TableRootContext = createContext<TableRootContextValue>({} as TableRootContextValue);
