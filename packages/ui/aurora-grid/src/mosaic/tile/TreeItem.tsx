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

import { useMosaic, useMosaicDnd } from '../mosaic';
import { TreeItemTile } from '../types';

const TreeItemBody = ({ subtiles, level }: { subtiles: DeepSignal<TreeItemTile[]>; level: number }) => {
  return (
    <AuroraTreeItem.Body asChild>
      <Tree.Branch>
        <SortableContext items={subtiles} strategy={verticalListSortingStrategy}>
          {subtiles.map((tile) => (
            <TreeItem key={tile.id} {...tile} level={level + 1} />
          ))}
        </SortableContext>
      </Tree.Branch>
    </AuroraTreeItem.Body>
  );
};

export const TreeItem = forwardRef<HTMLDivElement, TreeItemTile>((tile, forwardedRef) => {
  const {
    mosaic: { tiles, relations },
    data: { [tile.id]: treeItemData },
    Delegator,
  } = useMosaic();
  const { activeId, migrationDestinationId } = useMosaicDnd();
  const { attributes, listeners, setNodeRef, transform } = useSortable({
    id: tile.id,
    data: tile,
  });
  const ref = useComposedRefs(setNodeRef, forwardedRef);

  const isActive = activeId === tile.id;
  const isMigrationDestination = migrationDestinationId === tile.id;

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
      style={{
        transform: CSS.Translate.toString(transform),
        transition: activeId ? 'transform 200ms ease' : 'none',
      }}
      isActive={isActive}
      isMigrationDestination={!isActive && isMigrationDestination}
      ref={ref}
    >
      {subtiles.length > 0 && <TreeItemBody subtiles={subtiles} level={tile.level} />}
    </Delegator>
  );
});
