//
// Copyright 2023 DXOS.org
//

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { sortByIndex } from '@tldraw/indices';
import { DeepSignal } from 'deepsignal';
import React, { forwardRef } from 'react';

import { Tree, TreeItem as AuroraTreeItem } from '@dxos/aurora';

import { useDragEnd } from '../dnd';
import { useHandleRearrange } from '../dnd/handlers';
import { useMosaic, useMosaicData, useMosaicDnd } from '../mosaic';
import { TreeItemTile } from '../types';

export const TreeItem = forwardRef<HTMLDivElement, TreeItemTile>((tile, forwardedRef) => {
  const {
    Delegator,
    mosaic: { tiles, relations },
  } = useMosaic();
  const { [tile.id]: treeItemData } = useMosaicData();
  const { activeId } = useMosaicDnd();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: tile.isOverlay ? `${tile.id}--overlay` : tile.id,
    data: tile,
  });
  const ref = useComposedRefs(setNodeRef, forwardedRef);
  const subtileIds = relations[tile.id]?.child ?? new Set();
  const subtiles: DeepSignal<TreeItemTile[]> = Array.from(subtileIds)
    .map((id) => tiles[id] as TreeItemTile)
    .sort(sortByIndex);

  const handleRearrange = useHandleRearrange(subtileIds, subtiles);

  useDragEnd(
    (event) => {
      handleRearrange(event);
    },
    [handleRearrange],
  );

  return (
    <Delegator
      data={treeItemData}
      tile={tile}
      dragHandleAttributes={attributes}
      dragHandleListeners={listeners}
      style={{ transform: CSS.Translate.toString(transform), transition, ...(activeId === tile.id && { opacity: 0 }) }}
      ref={ref}
    >
      {subtiles.length > 0 && (
        <AuroraTreeItem.Body asChild>
          <Tree.Branch>
            <SortableContext items={subtiles} strategy={verticalListSortingStrategy}>
              {subtiles.map((tile) => (
                <TreeItem key={tile.id} {...tile} level={tile.level + 1} />
              ))}
            </SortableContext>
          </Tree.Branch>
        </AuroraTreeItem.Body>
      )}
    </Delegator>
  );
});
