//
// Copyright 2025 DXOS.org
//

import { SheetStatusbar } from '../FunctionEditor';
import { SheetContent } from '../GridSheet';
import { SheetProvider, type SheetProviderProps as SheetRootProps } from '../SheetContext';
import { SheetToolbar, type SheetToolbarProps } from '../SheetToolbar';

export const Sheet = {
  Root: SheetProvider,
  Content: SheetContent,
  Toolbar: SheetToolbar,
  Statusbar: SheetStatusbar,
};

export type { SheetRootProps, SheetToolbarProps };
