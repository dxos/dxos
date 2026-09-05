//
// Copyright 2023 DXOS.org
//

import { ContextMenuParts, DropdownMenuParts } from './DropdownMenu';
import { DropdownMenuEntries } from './MenuEntries';

export * from './DropdownMenu';
export * from './MenuEntries';
export * from './menu-entry-label';

/** The parts, plus the data-driven `Entries` renderer. */
export const DropdownMenu = { ...DropdownMenuParts, Entries: DropdownMenuEntries };
export const ContextMenu = { ...ContextMenuParts, Entries: DropdownMenuEntries };
export {
  type MenuAlign,
  type MenuContentHandlers,
  type MenuPlacementOptions,
  type MenuSelectHandler,
  type MenuSide,
  useMenuContext as useDropdownMenuContext,
} from './DropdownMenuContext';
