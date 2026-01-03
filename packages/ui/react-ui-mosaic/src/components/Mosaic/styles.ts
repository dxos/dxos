//
// Copyright 2026 DXOS.org
//

import { MOSAIC_CELL_STATE_ATTR, MOSAIC_CONTAINER_STATE_ATTR } from './Mosaic';

export const styles = {
  container: {
    active: `[&:has(>_[data-${MOSAIC_CONTAINER_STATE_ATTR}=active])]:border-primary-500`,
  },
  cell: {
    dragging: `data-[${MOSAIC_CELL_STATE_ATTR}=dragging]:opacity-20 data-[${MOSAIC_CELL_STATE_ATTR}=preview]:bg-groupSurface`,
  },
};
