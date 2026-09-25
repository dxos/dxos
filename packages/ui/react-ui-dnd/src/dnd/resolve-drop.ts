//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';

import { type DndContainerHandler, type DndData, type DndTileData } from './types.ts';

// Kept out of `Root.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a helper exported beside them forces a full page reload on every edit.

/**
 * Resolve a completed drop by routing it to the appropriate container handler(s).
 * Same handler: the target handles the drop directly (e.g., reorder within a container).
 * Different handlers: the source is asked to relinquish the object (`onTake`), and only once
 * it supplies the (possibly transformed) object does the target receive the drop.
 */
export const resolveDrop = (
  sourceHandler: DndContainerHandler | undefined,
  targetHandler: DndContainerHandler | undefined,
  source: DndTileData,
  target?: DndData,
): void => {
  if (!sourceHandler || !targetHandler) {
    return;
  }

  if (sourceHandler === targetHandler) {
    targetHandler.onDrop?.({ source, target });
  } else {
    if (!sourceHandler.onTake) {
      log.warn('invalid source', { source });
      return;
    }

    sourceHandler.onTake({ source }, async (object) => {
      targetHandler.onDrop?.({ source: { ...source, data: object }, target });
      return true;
    });
  }
};
