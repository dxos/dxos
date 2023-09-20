//
// Copyright 2023 DXOS.org
//

import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { batch } from '@preact/signals-core';
import { getIndexAbove } from '@tldraw/indices';
import { useCallback } from 'react';

import { useMosaic } from '../../mosaic';
import { CopyTileAction, MosaicState, Tile } from '../../types';
import { getSubtiles } from '../../util';
import { useDnd } from '../DndContext';
import { nextRearrangeIndex } from '../util';
import { managePreview } from '../util/manage-preview';

export const useHandleCopyDragStart = () => {
  const dnd = useDnd();
  const deps = [dnd];
  return useCallback(({ active }: DragStartEvent) => {
    dnd.activeCopyClass = active?.data?.current?.copyClass ?? null;
  }, deps);
};
export const useHandleCopyDragEnd = () => {
  const {
    mosaic: { tiles, relations },
    onMosaicChange,
    copyTile,
  } = useMosaic();
  const dnd = useDnd();
  const deps = [tiles, relations, onMosaicChange, dnd];
  return useCallback(({ active, over }: DragEndEvent, previousResult: string | null = null) => {
    let result = previousResult;
    const activeId = active.id.toString();
    if (!previousResult && activeId && dnd.copyDestinationId) {
      // create new tile
      const copiedTile = copyTile(activeId, dnd.copyDestinationId, { tiles, relations }, 'copy');
      // update copied tile’s index
      const subtiles = getSubtiles(relations[dnd.copyDestinationId].child, tiles);
      const previewTile = subtiles.find(({ id }) => id.startsWith('preview--'));
      const index = previewTile?.index ?? nextRearrangeIndex(subtiles, copiedTile.id, over?.id);
      copiedTile.index = index ?? (subtiles.length > 0 ? getIndexAbove(subtiles[subtiles.length - 1].index) : 'a0');
      // update mosaic state
      batch(() => {
        tiles[copiedTile.id] = copiedTile;
        previewTile && relations[dnd.copyDestinationId!].child.delete(previewTile.id);
        relations[copiedTile.id] = { parent: new Set([dnd.copyDestinationId!]), child: new Set() };
        relations[dnd.copyDestinationId!].child.add(copiedTile.id);
        previewTile && delete tiles[previewTile.id];
      });
      // fire onMosaicChange
      onMosaicChange?.({
        type: 'copy',
        id: copiedTile.id,
        toId: dnd.copyDestinationId,
        ...(copiedTile.index && { index: copiedTile.index }),
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

const findCopyDestination = (
  tile: Tile | undefined,
  copyClass: Set<string>,
  mosaic: MosaicState,
  activeId: string,
  copyTile: CopyTileAction,
): string | null => {
  if (!tile) {
    return null;
  } else if (tile.acceptCopyClass && copyClass.has(tile.acceptCopyClass)) {
    const targetId = copyTile(activeId, tile.id, mosaic, 'copy').id;
    return mosaic.tiles[targetId] ? null : tile.id;
  } else if ((mosaic.relations[tile.id]?.parent?.size ?? 0) < 1) {
    return null;
  } else {
    return findCopyDestination(
      mosaic.tiles[Array.from(mosaic.relations[tile.id].parent)[0]],
      copyClass,
      mosaic,
      activeId,
      copyTile,
    );
  }
};

export const useHandleCopyDragOver = () => {
  const { mosaic, copyTile } = useMosaic();
  const dnd = useDnd();
  const deps = [mosaic, dnd];
  return useCallback(({ active, over }: DragOverEvent) => {
    if (over?.id.toString().startsWith('preview--')) {
      return;
    }
    if (dnd.activeCopyClass && over?.data?.current) {
      const overTile = over?.data?.current as Tile | undefined;
      const nextDestinationId =
        findCopyDestination(overTile, dnd.activeCopyClass, mosaic, active.id.toString(), copyTile) ?? null;
      managePreview({ operation: 'copy', active, over, mosaic, copyTile, dnd, nextDestinationId });
    } else {
      dnd.copyDestinationId = null;
    }
  }, deps);
};
