//
// Copyright 2023 DXOS.org
//

import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { useCallback } from 'react';

import { useMosaic } from './useMosaic';
import { useMosaicDnd } from '../../dnd';
import { MosaicState, Tile } from '../../types';
import { getSubtiles, nextRearrangeIndex } from '../../util';

export const useHandleMigrateDragStart = () => {
  const { mosaic } = useMosaic();
  const dnd = useMosaicDnd();
  return useCallback(
    ({ active }: DragStartEvent) => {
      const migrationClass = active?.data?.current?.migrationClass ?? null;
      dnd.activeMigrationClass = active?.data?.current?.migrationClass ?? null;
      dnd.inhibitMigrationDestinationId = migrationClass
        ? findMigrationDestination(active.data.current as Tile, migrationClass, mosaic)
        : null;
    },
    [dnd, mosaic],
  );
};

export const useHandleMigrateDragEnd = () => {
  const {
    mosaic: { tiles, relations },
    onMosaicChange,
  } = useMosaic();
  const dnd = useMosaicDnd();
  const deps = [tiles, relations, onMosaicChange, dnd];
  return useCallback(({ active, over }: DragEndEvent, previousResult: string | null = null) => {
    let result = previousResult;
    const activeId = active.id.toString();
    if (!previousResult && activeId && dnd.migrationDestinationId) {
      // remove active tile id from parent’s child relations
      const parentIds = Array.from(relations[activeId]?.parent ?? []);
      parentIds.forEach((id) => relations[id].child?.delete(activeId!));
      // update active tile’s index
      const index = nextRearrangeIndex(
        getSubtiles(relations[dnd.migrationDestinationId].child, tiles),
        activeId,
        over?.id,
      );
      tiles[activeId].index = index ?? tiles[activeId].index;
      // update active tile’s parent relation
      relations[activeId].parent = new Set([dnd.migrationDestinationId]);
      // add active tile to new parent’s child relations
      relations[dnd.migrationDestinationId].child.add(activeId);
      // fire onMosaicChange
      onMosaicChange?.({
        type: 'migrate',
        id: activeId,
        fromId: parentIds[0],
        toId: dnd.migrationDestinationId,
        ...(index && { index }),
      });
      // update animation
      dnd.overlayDropAnimation = 'into';
      // return result
      result = dnd.migrationDestinationId;
    }
    dnd.migrationDestinationId = null;
    dnd.activeMigrationClass = null;
    return result;
  }, deps);
};

const findMigrationDestination = (
  tile: Tile | undefined,
  migrationClass: string,
  mosaic: MosaicState,
): string | null => {
  if (!tile) {
    return null;
  } else if (tile.acceptMigrationClass?.has(migrationClass)) {
    return tile.id;
  } else if ((mosaic.relations[tile.id]?.parent?.size ?? 0) < 1) {
    return null;
  } else {
    return findMigrationDestination(
      mosaic.tiles[Array.from(mosaic.relations[tile.id].parent)[0]],
      migrationClass,
      mosaic,
    );
  }
};

export const useHandleMigrateDragOver = () => {
  const { mosaic } = useMosaic();
  const dnd = useMosaicDnd();
  return useCallback(
    ({ over }: DragOverEvent) => {
      if (dnd.activeMigrationClass && over?.data?.current) {
        const overTile = over?.data?.current as Tile | undefined;
        const migrationDestinationId = findMigrationDestination(overTile, dnd.activeMigrationClass, mosaic) ?? null;
        dnd.migrationDestinationId =
          migrationDestinationId === dnd.inhibitMigrationDestinationId ? null : migrationDestinationId;
      } else {
        dnd.migrationDestinationId = null;
      }
    },
    [mosaic, dnd],
  );
};
