//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useMemo } from 'react';

/**
 * Type for a filter function that filters an array of objects.
 */
export type FilterFunction<T = any> = (objects: T[]) => T[];

type GlobalFilterContextType = {
  /** The current filter function. */
  filter?: FilterFunction;
};

const GlobalFilterContext = createContext<GlobalFilterContextType>({});

export type GlobalFilterProviderProps = PropsWithChildren<{
  /** The filter function to apply globally. */
  filter?: FilterFunction;
}>;

/**
 * Provider that makes a filter function available globally.
 * Used by plugin-search to provide its regex-based filtering.
 */
export const GlobalFilterProvider = ({ children, filter }: GlobalFilterProviderProps) => {
  const value = useMemo(() => ({ filter }), [filter]);
  return <GlobalFilterContext.Provider value={value}>{children}</GlobalFilterContext.Provider>;
};

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
