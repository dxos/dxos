//
// Copyright 2025 DXOS.org
//

import { createContext } from 'react';

// Kept out of `useGlobalFilter.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

/**
 * Type for a filter function that filters an array of objects.
 */
export type FilterFunction<T = any> = (objects: T[]) => T[];

export type GlobalFilterContextType = {
  /** The current filter function. */
  filter?: FilterFunction;
};

export const GlobalFilterContext = createContext<GlobalFilterContextType>({});
