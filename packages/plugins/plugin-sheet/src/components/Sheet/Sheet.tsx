//
// Copyright 2025 DXOS.org
//

import { SheetStatusbar } from '../FunctionEditor';
import { SheetContent } from '../GridSheet';
import { SheetRoot, type SheetRootProps } from '../SheetContext';
import { SheetToolbar, type SheetToolbarProps } from '../SheetToolbar';

export const Sheet = {
  Root: SheetRoot,
  Content: SheetContent,
  Toolbar: SheetToolbar,
  Statusbar: SheetStatusbar,
};

export type { SheetRootProps, SheetToolbarProps };
