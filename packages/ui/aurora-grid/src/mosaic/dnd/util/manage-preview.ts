//
// Copyright 2023 DXOS.org
//

import { DragOverEvent, UniqueIdentifier } from '@dnd-kit/core';
import { batch } from '@preact/signals-core';
import { DeepSignal } from 'deepsignal';

import { getDndId, parseDndId } from './dnd-id';
import { nextCopyIndex } from './next-index';
import { CopyTileAction, MosaicState } from '../../types';
import { getSubtiles } from '../../util';
import { DndContextValue } from '../DndContext';

export type ManagePreviewArgs = {
  operation: 'migrate' | 'copy';
  nextDestinationId: string | null;
  dnd: DeepSignal<DndContextValue>;
  mosaic: DeepSignal<MosaicState>;
  copyTile: CopyTileAction;
};

const getPreviewId = (activeId: UniqueIdentifier, copyDestId: string) => {
  const [mosaicId] = parseDndId(copyDestId);
  const [_, ...activeIdParts] = parseDndId(activeId.toString());
  return getDndId(`preview--${mosaicId}`, ...activeIdParts);
};

export const managePreview = ({
  operation,
  nextDestinationId,
  dnd,
  mosaic,
  active,
  over,
  copyTile,
}: ManagePreviewArgs & Pick<DragOverEvent, 'active' | 'over'>) => {
  const prevDestinationId = operation === 'copy' ? dnd.copyDestinationId : dnd.migrationDestinationId;
  if (nextDestinationId) {
    // There is a copy destination, so a preview tile needs to be there
    if (prevDestinationId) {
      // There is a preview somewhere already
      if (nextDestinationId === prevDestinationId) {
        // Just update preview’s index in-situ
        const previewId = getPreviewId(active.id, nextDestinationId);
        if (over?.id === previewId) {
          // Do nothing
        } else {
          const index = nextCopyIndex(getSubtiles(mosaic.relations[prevDestinationId].child, mosaic.tiles), over?.id);
          if (mosaic.tiles[previewId].index !== index) {
            mosaic.tiles[previewId].index = index;
          }
        }
      } else {
        // Remove preview from old parent and add to new parent
        const prevPreviewId = getPreviewId(active.id, prevDestinationId);
        const nextPreviewId = getPreviewId(active.id, nextDestinationId);
        batch(() => {
          mosaic.relations[prevDestinationId!].child.delete(prevPreviewId);
          mosaic.relations[nextDestinationId].child.add(nextPreviewId);
          const nextTile = {
            ...mosaic.tiles[prevPreviewId],
            id: nextPreviewId,
          };
          delete mosaic.tiles[prevPreviewId];
          mosaic.tiles[nextPreviewId] = nextTile;
          dnd[operation === 'copy' ? 'copyDestinationId' : 'migrationDestinationId'] = nextDestinationId;
        });
      }
    } else {
      // Create the preview
      const previewId = getPreviewId(active.id, nextDestinationId);
      const previewTile = {
        ...copyTile(active.id.toString(), nextDestinationId, mosaic, operation),
        id: previewId,
        index: '',
        isPreview: true,
      };
      batch(() => {
        mosaic.tiles[previewId] = previewTile;
        mosaic.tiles[previewId].index = nextCopyIndex(
          getSubtiles(mosaic.relations[nextDestinationId].child, mosaic.tiles),
          over?.id,
        );
        mosaic.relations[nextDestinationId].child.add(previewId);
        dnd[operation === 'copy' ? 'copyDestinationId' : 'migrationDestinationId'] = nextDestinationId;
      });
    }
  } else {
    // There is no copy destination, so if there is a preview tile it should be removed
    if (prevDestinationId) {
      // A preview tile was added to mosaic, remove it
      batch(() => {
        const previewId = getPreviewId(active.id, prevDestinationId!);
        mosaic.relations[prevDestinationId!].child.delete(previewId);
        delete mosaic.relations[previewId];
        delete mosaic.tiles[previewId];
        dnd[operation === 'copy' ? 'copyDestinationId' : 'migrationDestinationId'] = null;
      });
    }
    // `else`: No action necessary
  }
};
