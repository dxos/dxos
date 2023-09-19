//
// Copyright 2023 DXOS.org
//

import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { useCallback } from 'react';

import { useMosaic } from '../../mosaic';
import { CopyTileAction, MosaicState, Tile } from '../../types';
import { getSubtiles } from '../../util';
import { useDnd } from '../DndContext';
import { nextIndex } from '../util';

export const useHandleCopyDragStart = () => {
  const dnd = useDnd();
  const deps = [dnd];
  return useCallback(({ active }: DragStartEvent) => {
    dnd.activeCopyClass = active?.data?.current?.copyClass ?? null;
  }, deps);
};

const defaultCopyTile: CopyTileAction = (id, toId, mosaic) => {
  return {
    ...mosaic.tiles[id],
  };
};

export const useHandleCopyDragEnd = () => {
  const {
    mosaic: { tiles, relations },
    onMosaicChange,
    copyTile = defaultCopyTile,
  } = useMosaic();
  const dnd = useDnd();
  const deps = [tiles, relations, onMosaicChange, dnd];
  return useCallback(({ active, over }: DragEndEvent, previousResult?: string | null) => {
    let result = null;
    const activeId = active.id.toString();
    console.log('[copy drag end]', previousResult, activeId, dnd.copyDestinationId);
    if (!previousResult && activeId && dnd.copyDestinationId) {
      // create new tile
      const copiedTile = copyTile(activeId, dnd.copyDestinationId, { tiles, relations });
      // update copied tile’s index
      const index = nextIndex(getSubtiles(relations[dnd.copyDestinationId].child, tiles), activeId, over?.id);
      copiedTile.index = index ?? copiedTile.index;
      // update mosaic state
      tiles[copiedTile.id] = copiedTile;
      relations[copiedTile.id] = { parent: new Set([dnd.copyDestinationId]), child: new Set() };
      relations[dnd.copyDestinationId].child.add(copiedTile.id);
      // fire onMosaicChange
      onMosaicChange?.({
        type: 'copy',
        id: copiedTile.id,
        toId: dnd.copyDestinationId,
        ...(index && { index }),
      });
      // update animation
      dnd.overlayDropAnimation = 'into';
      // return result
      result = dnd.copyDestinationId;
    }
    dnd.copyDestinationId = null;
    dnd.activeCopyClass = null;
    return result;
  }, deps);
};

const findCopyDestination = (tile: Tile | undefined, copyClass: string, mosaic: MosaicState): string | null => {
  if (!tile) {
    return null;
  } else if (tile.acceptCopyClass?.has(copyClass)) {
    return tile.id;
  } else if ((mosaic.relations[tile.id]?.parent?.size ?? 0) < 1) {
    return null;
  } else {
    return findCopyDestination(mosaic.tiles[Array.from(mosaic.relations[tile.id].parent)[0]], copyClass, mosaic);
  }
};

export const useHandleCopyDragOver = () => {
  const { mosaic } = useMosaic();
  const dnd = useDnd();
  const deps = [mosaic, dnd];
  return useCallback(({ over }: DragOverEvent) => {
    if (dnd.activeCopyClass && over?.data?.current) {
      const overTile = over?.data?.current as Tile | undefined;
      dnd.copyDestinationId = findCopyDestination(overTile, dnd.activeCopyClass, mosaic) ?? null;
    } else {
      dnd.copyDestinationId = null;
    }
  }, deps);
};
