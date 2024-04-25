//
// Copyright 2024 DXOS.org
//

import type React from 'react';
import { createContext, useState } from 'react';

type TableRootContextActions = { type: 'updateScrollContextRef'; ref: React.RefObject<HTMLDivElement> };

export const useTableRootContext = (initialRef?: React.RefObject<HTMLDivElement>) => {
  const [scrollContextRef, setScrollContextRef] = useState(initialRef);

  const dispatch = (action: TableRootContextActions) => {
    switch (action.type) {
      case 'updateScrollContextRef':
        setScrollContextRef(action.ref);
        break;

      default:
        break;
    }
  };

  return { scrollContextRef, dispatch };
};

export type TableRootContextValue = ReturnType<typeof useTableRootContext>;

// Create the context without a default value.
// The expectation is that the provider will always supply a value, so no need to define a default here.
export const TableRootContext = createContext<TableRootContextValue>({} as TableRootContextValue);
