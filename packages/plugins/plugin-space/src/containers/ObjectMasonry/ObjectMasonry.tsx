//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Masonry } from '@dxos/react-ui-masonry';

import { TileAdapter, type TileData } from './ObjectTile';

export type ObjectMasonryProps = {
  /** Keys the persisted column layout; stable per view, so the grid does not reflow on remount. */
  cacheKey: string;
  items: TileData[];
};

/** A grid of object cards — the shared body of every view that shows a set of objects as tiles. */
export const ObjectMasonry = ({ cacheKey, items }: ObjectMasonryProps) => (
  <Masonry.Root Tile={TileAdapter}>
    <Masonry.Content>
      <Masonry.Viewport cacheKey={cacheKey} getId={(data) => data.object.id} items={items} />
    </Masonry.Content>
  </Masonry.Root>
);

ObjectMasonry.displayName = 'ObjectMasonry';
