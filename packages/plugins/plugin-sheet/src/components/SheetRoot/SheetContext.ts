//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type SheetContextValue } from './SheetRoot.tsx';

// Kept out of `SheetRoot.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

// TODO(burdon): Use radix context.
export const SheetContext = createContext<SheetContextValue | undefined>(undefined);

export const useSheetContext = (): SheetContextValue => {
  return useContext(SheetContext) ?? raise(new Error('Missing SheetContext'));
};
