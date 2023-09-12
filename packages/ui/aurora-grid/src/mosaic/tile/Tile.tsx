//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { Card } from '../card';
import { Stack } from '../stack';
import { TileProps } from '../types';

const Tile = (props: TileProps) => {
  switch (props.tile.variant) {
    case 'stack':
      return <Stack {...props} />;
    case 'card':
      return <Card {...props} />;
    default:
      return null;
  }
};

export { Tile };
