//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useMemo } from 'react';

import { type FilterFunction, GlobalFilterContext } from './GlobalFilterContext.ts';

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
