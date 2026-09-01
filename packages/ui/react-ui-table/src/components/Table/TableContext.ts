//
// Copyright 2024 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { type RefObject } from 'react';

import { type TableController } from './Table.tsx';

// Kept out of `Table.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

// Context
//

export type TableContextValue = {
  /** Mutable ref populated by Content so Root can expose the controller. */
  controllerRef: RefObject<TableController>;
};

export const [TableContextProvider, useTableContext] = createContext<TableContextValue>('Table');
