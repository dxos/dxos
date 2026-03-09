//
// Copyright 2025 DXOS.org
//

import { SheetContent } from '../SheetContent';
import { SheetRoot, type SheetRootProps } from '../SheetRoot';
import { SheetStatusbar } from '../SheetStatusbar';
import { SheetToolbar, type SheetToolbarProps } from '../SheetToolbar';

export const Sheet = {
  Root: SheetRoot,
  Toolbar: SheetToolbar,
  Content: SheetContent,
  Statusbar: SheetStatusbar,
};

export type { SheetRootProps, SheetToolbarProps };
