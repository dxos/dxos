//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Root } from '../TileSlots';

export interface FallbackTile {
  tile: Object;
}

export const FallbackTile = ({ tile }: FallbackTile) => {
  return (
    <Root label={<h2>{tile && 'title' in tile ? (tile as { title: any }).title : 'Unknown object'}</h2>}>
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
