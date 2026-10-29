//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, type MouseEvent, useCallback } from 'react';

import { Masonry } from '@dxos/react-ui-masonry';

import { TileAdapter, type TileData } from './ObjectTile.tsx';

export type ObjectMasonryProps = {
  /** Keys the persisted column layout; stable per view, so the grid does not reflow on remount. */
  cacheKey: string;
  items: TileData[];
};

/** A grid of object cards - the shared body of every view that shows a set of objects as tiles. */
export const ObjectMasonry = ({ cacheKey, items }: ObjectMasonryProps) => {
  // The masonry item is the tile's focusable unit. A plain click or Enter opens the object when it can be opened; a
  // modified one (or a tile that cannot open) selects it, so the review workflow still selects without navigating.
  const itemProps = useCallback(
    (id: string) => ({
      onActivate: (event: MouseEvent | KeyboardEvent) => {
        const item = items.find((item) => item.object.id === id);
        const select = event.metaKey || event.ctrlKey || event.shiftKey;
        if (item?.onOpen && !select) {
          item.onOpen(item.object);
        } else {
          item?.onSelect?.(id);
        }
      },
    }),
    [items],
  );

  return (
    <Masonry.Root Tile={TileAdapter}>
      <Masonry.Content>
        <Masonry.Viewport cacheKey={cacheKey} getId={(data) => data.object.id} items={items} itemProps={itemProps} />
      </Masonry.Content>
    </Masonry.Root>
  );
};

ObjectMasonry.displayName = 'ObjectMasonry';
