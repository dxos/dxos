//
// Copyright 2026 DXOS.org
//

export const styles = {
  container: {
    active: `[&:has(>_[data-mosaic-container-state=active])]:border-primary-500`,
  },
  cell: {
    dragging: `data-[mosaic-cell-state=dragging]:opacity-20`,
  },
};
