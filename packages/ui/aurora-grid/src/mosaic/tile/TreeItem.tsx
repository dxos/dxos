//
// Copyright 2023 DXOS.org
//

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { sortByIndex } from '@tldraw/indices';
import { DeepSignal } from 'deepsignal';
import React, { forwardRef, memo } from 'react';

import { Tree, TreeItem as AuroraTreeItem } from '@dxos/aurora';

import { useMosaic, useMosaicData, useMosaicDnd } from '../mosaic';
import { TreeItemTile } from '../types';

const TreeItemBody = memo(({ subtiles, level }: { subtiles: DeepSignal<TreeItemTile[]>; level: number }) => {
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
});

export const TreeItem = forwardRef<HTMLDivElement, TreeItemTile>((tile, forwardedRef) => {
  const {
    Delegator,
    mosaic: { tiles, relations },
  } = useMosaic();
  const { [tile.id]: treeItemData } = useMosaicData();
  const { activeId } = useMosaicDnd();
  const { attributes, listeners, setNodeRef, transform } = useSortable({
    id: tile.isOverlay ? `${tile.id}--overlay` : tile.id,
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
      style={{
        transform: CSS.Translate.toString(transform),
        transition: activeId ? 'transform 200ms ease' : 'none',
        ...(activeId === tile.id && { opacity: 0 }),
      }}
      ref={ref}
    >
      {subtiles.length > 0 && <TreeItemBody subtiles={subtiles} level={tile.level} />}
    </Delegator>
  );
});
