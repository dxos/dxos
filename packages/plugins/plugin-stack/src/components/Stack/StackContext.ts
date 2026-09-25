//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { type StackContextType, type StackContextValue } from './Stack.tsx';

// Kept out of `Stack.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const StackContext = createContext<StackContextType | undefined>(undefined);

export const useStackContext = (consumer: string): StackContextType => {
  const context = useContext(StackContext);
  if (!context) {
    throw new Error(`\`${consumer}\` must be used within \`Stack.Root\`.`);
  }
  return context;
};

/** Section-level callbacks consumed by stack sections. */
export const useStack = (): StackContextValue => useStackContext('useStack');
