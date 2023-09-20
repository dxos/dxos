//
// Copyright 2023 DXOS.org
//

import { DragEndEvent, DragOverEvent, DragStartEvent, UniqueIdentifier } from '@dnd-kit/core';
import { batch } from '@preact/signals-core';
import { getIndexAbove } from '@tldraw/indices';
import { useCallback } from 'react';

import { useMosaic } from '../../mosaic';
import { CopyTileAction, MosaicState, Tile } from '../../types';
import { getSubtiles } from '../../util';
import { useDnd } from '../DndContext';
import { getDndId, nextCopyIndex, nextRearrangeIndex, parseDndId } from '../util';

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
  return useCallback(({ active, over }: DragEndEvent, previousResult: string | null = null) => {
    let result = previousResult;
    const activeId = active.id.toString();
    if (!previousResult && activeId && dnd.copyDestinationId) {
      // create new tile
      const copiedTile = copyTile(activeId, dnd.copyDestinationId, { tiles, relations });
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
    const targetId = copyTile(activeId, tile.id, mosaic).id;
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

const getPreviewId = (activeId: UniqueIdentifier, copyDestId: string) => {
  const [mosaicId] = parseDndId(copyDestId);
  const [_, ...activeIdParts] = parseDndId(activeId.toString());
  return getDndId(`preview--${mosaicId}`, ...activeIdParts);
};

export const useHandleCopyDragOver = () => {
  const { mosaic, copyTile } = useMosaic();
  const dnd = useDnd();
  const deps = [mosaic, dnd];
  return useCallback(({ active, over }: DragOverEvent) => {
    if (over?.id.toString().startsWith('preview--')) {
      console.log('[over preview]');
      return;
    }
    if (dnd.activeCopyClass && over?.data?.current) {
      const overTile = over?.data?.current as Tile | undefined;
      const nextCopyDest =
        findCopyDestination(overTile, dnd.activeCopyClass, mosaic, active.id.toString(), copyTile) ?? null;
      if (nextCopyDest) {
        // There is a copy destination, so a preview tile needs to be there
        if (dnd.copyDestinationId) {
          // There is a preview somewhere already
          if (nextCopyDest === dnd.copyDestinationId) {
            // Just update preview’s index in-situ
            const previewId = getPreviewId(active.id, nextCopyDest);
            if (over?.id === previewId) {
              // Do nothing
            } else {
              const index = nextCopyIndex(
                getSubtiles(mosaic.relations[dnd.copyDestinationId].child, mosaic.tiles),
                over?.id,
              );
              if (mosaic.tiles[previewId].index !== index) {
                mosaic.tiles[previewId].index = index;
              }
            }
          } else {
            // Remove preview from old parent and add to new parent
            const prevPreviewId = getPreviewId(active.id, dnd.copyDestinationId);
            const nextPreviewId = getPreviewId(active.id, nextCopyDest);
            batch(() => {
              mosaic.relations[dnd.copyDestinationId!].child.delete(prevPreviewId);
              mosaic.relations[nextCopyDest].child.add(nextPreviewId);
              mosaic.tiles[nextPreviewId] = {
                ...mosaic.tiles[prevPreviewId],
                id: nextPreviewId,
              };
              delete mosaic.tiles[prevPreviewId];
              dnd.copyDestinationId = nextCopyDest;
            });
          }
        } else {
          // Create the preview
          const previewId = getPreviewId(active.id, nextCopyDest);
          const previewTile = {
            ...copyTile(active.id.toString(), nextCopyDest, mosaic),
            id: previewId,
            index: '',
            isPreview: true,
          };
          batch(() => {
            mosaic.tiles[previewId] = previewTile;
            mosaic.tiles[previewId].index = nextCopyIndex(
              getSubtiles(mosaic.relations[nextCopyDest].child, mosaic.tiles),
              over?.id,
            );
            mosaic.relations[nextCopyDest].child.add(previewId);
            dnd.copyDestinationId = nextCopyDest;
          });
        }
      } else {
        // There is no copy destination, so if there is a preview tile it should be removed
        if (dnd.copyDestinationId) {
          // A preview tile was added to mosaic, remove it
          batch(() => {
            const previewId = getPreviewId(active.id, dnd.copyDestinationId!);
            mosaic.relations[dnd.copyDestinationId!].child.delete(previewId);
            delete mosaic.tiles[previewId];
            dnd.copyDestinationId = null;
          });
        }
        // `else`: No action necessary
      }
    }
  }, deps);
};
