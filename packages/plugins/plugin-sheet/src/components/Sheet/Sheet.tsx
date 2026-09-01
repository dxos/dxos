//
// Copyright 2025 DXOS.org
//

import { SheetContent } from '../SheetContent/index.ts';
import { SheetRoot } from '../SheetRoot/index.ts';
import { SheetStatusbar } from '../SheetStatusbar/index.ts';
import { SheetToolbar } from '../SheetToolbar/index.ts';

export { type SheetContextValue, type SheetRootProps } from '../SheetRoot/index.ts';
export { type SheetContentProps } from '../SheetContent/index.ts';
export { type SheetToolbarProps } from '../SheetToolbar/index.ts';
export { type SheetStatusbarProps } from '../SheetStatusbar/index.ts';

export const Sheet = {
  Root: SheetRoot,
  Toolbar: SheetToolbar,
  Content: SheetContent,
  Statusbar: SheetStatusbar,
};
