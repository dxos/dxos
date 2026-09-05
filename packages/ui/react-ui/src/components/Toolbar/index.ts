//
// Copyright 2022 DXOS.org
//

import { ToolbarParts } from './Toolbar';
import { ToolbarEntries } from './ToolbarEntries';

export * from './Toolbar';
export * from './ToolbarEntries';

/** The parts, plus the data-driven `Entries` renderer. */
export const Toolbar = { ...ToolbarParts, Entries: ToolbarEntries };
