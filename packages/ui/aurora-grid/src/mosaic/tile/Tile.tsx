//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { Card } from '../card';
import { Stack } from '../stack';
import { TileProps } from '../types';

const Tile = ({ tile }: TileProps) => {
  console.log('[tile]', tile);
  switch (tile?.variant) {
    case 'stack':
      return <Stack tile={tile} />;
    case 'card':
      return <Card tile={tile} />;
    default:
      return null;
  }
};

export { Tile };
