//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

// Kept out of `Column.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

//
// Context
//

export const ColumnContext = createContext(false);

/**
 * Whether the caller is already inside a `Column.Root`. A component that would otherwise establish
 * its own gutter grid (a form viewport, say) should use this to place itself in the host's content
 * track instead — nesting a second grid is what makes a form's fields inset differently from the
 * card title above them.
 */
export const useInColumn = () => useContext(ColumnContext);
