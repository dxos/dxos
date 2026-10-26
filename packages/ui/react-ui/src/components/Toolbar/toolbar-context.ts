//
// Copyright 2026 DXOS.org
//

import { createContext, useContext, useId } from 'react';

import type * as toolbar from './toolbar-machine.ts';

// Optional by design: a control outside a toolbar renders without roving props.
export const ToolbarContext = createContext<toolbar.ToolbarApi | undefined>(undefined);

/** Roving-focus props for a control inside a Toolbar; empty outside one. */
export const useToolbarItem = (disabled?: boolean) => {
  const api = useContext(ToolbarContext);
  const value = useId();
  return api?.getItemProps({ value, disabled });
};
