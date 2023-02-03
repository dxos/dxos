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

export const isFallbackTIle = (props: any): props is FallbackTile => {
  return 'tile' in props;
};

export const renderIfFallbackTile = (props: any) => {
  if (isFallbackTIle(props)) {
    return <FallbackTile {...props} />;
  } else {
    return null;
  }
};
