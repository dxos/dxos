//
// Copyright 2025 DXOS.org
//

import { createContext, useContext, useMemo } from 'react';

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

/**
 * Hook to access the global filter context.
 * Returns the filter function if one is provided.
 */
export const useGlobalFilter = () => {
  return useContext(GlobalFilterContext);
};

/**
 * Hook that applies the global filter to an array of objects.
 * If no filter is set, returns the original objects unchanged.
 *
 * @example
 * const objects = useQuery(db, Filter.everything());
 * const filteredObjects = useGlobalFilteredObjects(objects);
 */
export const useGlobalFilteredObjects = <T extends Record<string, any>>(objects?: T[]): T[] => {
  const { filter } = useGlobalFilter();

  return useMemo(() => {
    if (!objects) {
      return [];
    }
    if (!filter) {
      return objects;
    }
    return filter(objects);
  }, [objects, filter]);
};
