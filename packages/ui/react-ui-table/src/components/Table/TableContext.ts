//
// Copyright 2024 DXOS.org
//

import { type RefObject } from 'react';

import { createContext } from '@dxos/react-hooks';

import { type TableController } from './Table';

// Kept out of `Table.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

// Context
//

export type TableContextValue = {
  /** Mutable ref populated by Content so Root can expose the controller. */
  controllerRef: RefObject<TableController>;
};

export const [TableContextProvider, useTableContext] = createContext<TableContextValue>('Table');
