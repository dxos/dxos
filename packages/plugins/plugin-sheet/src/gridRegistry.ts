//
// Copyright 2025 DXOS.org
//

import { type DxGridElement, type GridContentProps } from '@dxos/react-ui-grid';

/**
 * Module-level registry for grid instances.
 * Components register on mount and unregister on unmount.
 * Used by metadata scrollToCursor to find the right grid at invocation time.
 */
type GridEntry = { grid: DxGridElement; setActiveRefs: (refs: GridContentProps['activeRefs']) => void };

const grids = new Map<string, GridEntry>();

export const gridRegistry = {
  register: (attendableId: string, grid: DxGridElement, setActiveRefs: GridEntry['setActiveRefs']) => {
    grids.set(attendableId, { grid, setActiveRefs });
  },
  unregister: (attendableId: string) => {
    grids.delete(attendableId);
  },
  get: (attendableId: string) => grids.get(attendableId),
};
