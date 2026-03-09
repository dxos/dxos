//
// Copyright 2025 DXOS.org
//

import { FunctionEditor } from '../FunctionEditor';
import { GridSheet } from '../GridSheet';
import { SheetProvider, type SheetProviderProps as SheetRootProps } from '../SheetContext';
import { SheetToolbar, type SheetToolbarProps } from '../SheetToolbar';

/**
 * Radix-style compound component for sheets.
 *
 * - `Sheet.Root` — headless context provider (wraps Panel.Root from outside).
 * - `Sheet.Toolbar` — toolbar with alignment/style actions.
 * - `Sheet.Content` — grid content.
 * - `Sheet.Statusbar` — formula/function status bar.
 */
export const Sheet = {
  Root: SheetProvider,
  Content: GridSheet,
  Toolbar: SheetToolbar,
  Statusbar: FunctionEditor,
};

export type { SheetRootProps, SheetToolbarProps };
