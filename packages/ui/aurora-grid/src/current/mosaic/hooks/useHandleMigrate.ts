//
// Copyright 2023 DXOS.org
//

import { type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import { batch } from '@preact/signals-core';
import { useCallback } from 'react';

import { useMosaic } from './useMosaic';
import { useMosaicDnd } from '../../dnd';
import { type TileProps } from '../tile';
import { type MosaicState } from '../types';
import { getSubtiles, managePreview, nextRearrangeIndex } from '../util';

export const useHandleMigrateDragStart = () => {
  const { mosaic } = useMosaic();
  const dnd = useMosaicDnd();
  return useCallback(
    ({ active }: DragStartEvent) => {
      const migrationClass = active?.data?.current?.migrationClass ?? null;
      dnd.activeMigrationClass = active?.data?.current?.migrationClass ?? null;
      dnd.inhibitMigrationDestinationId = migrationClass
        ? findMigrationDestination(active.data.current as TileProps, migrationClass, null, mosaic)
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
      // get active tile’s index via the preview card, if present
      const subtiles = getSubtiles(relations[dnd.migrationDestinationId].child, tiles);
      const previewTile = subtiles.find(({ id }) => id.startsWith('preview--'));
      const index =
        previewTile?.index ??
        nextRearrangeIndex(getSubtiles(relations[dnd.migrationDestinationId].child, tiles), activeId, over?.id);
      // make deepsignal state changes
      batch(() => {
        previewTile && relations[dnd.migrationDestinationId!].child.delete(previewTile.id);
        tiles[activeId].index = index ?? tiles[activeId].index;
        // update active tile’s parent relation
        relations[activeId!].parent = new Set([dnd.migrationDestinationId!]);
        // add active tile to new parent’s child relations
        relations[dnd.migrationDestinationId!].child.add(activeId);
        previewTile && delete tiles[previewTile.id];
      });
      // fire onMosaicChange
      onMosaicChange?.({
        type: 'migrate',
        id: activeId,
        fromId: parentIds[0],
        toId: dnd.migrationDestinationId,
        ...(index && { index }),
      });
      // update animation
      dnd.overlayDropAnimation = 'around';
      // return result
      result = dnd.migrationDestinationId;
    }
    dnd.migrationDestinationId = null;
    dnd.activeMigrationClass = null;
    return result;
  }, deps);
};

export const useHandleMigrateDragOver = () => {
  const { mosaic, copyTile } = useMosaic();
  const dnd = useMosaicDnd();
  return useCallback(
    ({ active, over }: DragOverEvent) => {
      if (over?.id.toString().startsWith('preview--')) {
        return;
      }

      if (dnd.activeMigrationClass && over?.data?.current) {
        const overTile = over?.data?.current as TileProps | undefined;
        const nextDestinationId =
          findMigrationDestination(overTile, dnd.activeMigrationClass, dnd.inhibitMigrationDestinationId, mosaic) ??
          null;
        managePreview({
          operation: 'migrate',
          active,
          over,
          mosaic,
          copyTile,
          dnd,
          nextDestinationId,
        });
      } else {
        dnd.migrationDestinationId = null;
      }
    },
    [mosaic, dnd],
  );
};

const findMigrationDestination = (
  tile: TileProps | undefined,
  migrationClass: string,
  inhibitMigrationId: string | null,
  mosaic: MosaicState,
): string | null => {
  if (!tile) {
    return null;
  } else if (tile.acceptMigrationClass?.has(migrationClass)) {
    return tile.id === inhibitMigrationId ? null : tile.id;
  } else if ((mosaic.relations[tile.id]?.parent?.size ?? 0) < 1) {
    return null;
  } else {
    return findMigrationDestination(
      mosaic.tiles[Array.from(mosaic.relations[tile.id].parent)[0]],
      migrationClass,
      inhibitMigrationId,
      mosaic,
    );
  }
};
