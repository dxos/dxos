//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { TileSlots } from '../TileProps';
import { Root } from '../TileSlots';

export interface FallbackTile {
  tile: Object;
  slots?: TileSlots;
}

export const FallbackTile = ({ tile, slots = {} }: FallbackTile) => {
  return (
    <Root
      {...slots.root}
      label={<h2 {...slots.label}>{tile && 'title' in tile ? (tile as { title: any }).title : 'Unknown object'}</h2>}
    >
      <pre>{JSON.stringify(tile, null, 2)}</pre>
    </Root>
  );
};

export const isFallbackTIle = (o: any): o is FallbackTile => {
  return 'tile' in o;
};

export const renderIfFallbackTile = (o: any) => {
  if (isFallbackTIle(o)) {
    return <FallbackTile {...o} />;
  } else {
    return null;
  }
};
