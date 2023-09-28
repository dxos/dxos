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

import { useMosaicDnd } from '../../dnd';
import { TileProps, useMosaic } from '../../mosaic';

export type TreeItemTileProps = TileProps & {
  // Overrides
  variant: 'treeitem';
  sortable: true;
  // Special flags
  level: number;
  expanded?: boolean;
};

const TreeItemBody = ({ subtiles, level }: { subtiles: DeepSignal<TreeItemTileProps[]>; level: number }) => {
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

export const TreeItem = forwardRef<HTMLDivElement, TreeItemTileProps>((tile, forwardedRef) => {
  const {
    mosaic: { tiles, relations },
    getData,
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
  const subtiles: DeepSignal<TreeItemTileProps[]> = Array.from(subtileIds)
    .map((id) => tiles[id] as TreeItemTileProps)
    .sort(sortByIndex);

  return (
    <Delegator
      data={getData(tile.id)}
      tile={tile}
      dragHandleAttributes={attributes}
      dragHandleListeners={listeners}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: activeId ? 'transform 200ms ease' : 'none',
      }}
      isActive={isActive}
      isMigrationDestination={!isActive && isMigrationDestination}
      isPreview={tile.isPreview}
      ref={ref}
    >
      {subtiles.length > 0 && <TreeItemBody subtiles={subtiles} level={tile.level} />}
    </Delegator>
  );
});
