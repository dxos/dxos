//
// Copyright 2023 DXOS.org
//

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { sortByIndex } from '@tldraw/indices';
import { DeepSignal } from 'deepsignal';
import React, { forwardRef } from 'react';

import { TreeItem as AuroraTreeItem } from '@dxos/aurora';

import { useMosaic, useMosaicData } from '../mosaic';
import { TreeItemTile } from '../types';

export const TreeItem = forwardRef<HTMLDivElement, TreeItemTile>((tile, forwardedRef) => {
  const {
    Delegator,
    mosaic: { tiles, relations },
  } = useMosaic();
  const { [tile.id]: treeItemData } = useMosaicData();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: tile.id,
    data: tile,
  });
  const ref = useComposedRefs(setNodeRef, forwardedRef);
  const subtileIds = relations[tile.id]?.child ?? new Set();
  const subtiles: DeepSignal<TreeItemTile[]> = Array.from(subtileIds)
    .map((id) => tiles[id] as TreeItemTile)
    .sort(sortByIndex);
  return (
    <Delegator
      data={treeItemData}
      tile={tile}
      dragHandleAttributes={attributes}
      dragHandleListeners={listeners}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      ref={ref}
    >
      {subtiles.length > 0 && (
        <AuroraTreeItem.Body>
          <SortableContext items={subtiles} strategy={verticalListSortingStrategy}>
            {subtiles.map((tile) => (
              <TreeItem key={tile.id} {...tile} level={tile.level + 1} />
            ))}
          </SortableContext>
        </AuroraTreeItem.Body>
      )}
    </Delegator>
  );
});
