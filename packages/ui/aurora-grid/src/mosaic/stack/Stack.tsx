//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { useMosaic } from '../mosaic';
import { Tile } from '../tile';
import { TileProps } from '../types';

const Stack = ({ tile: { id, label } }: TileProps) => {
  const { items, relations } = useMosaic();
  const subtiles = Array.from(relations[id]?.child ?? []).map((id) => items[id]);
  console.log('[stack subtiles]', relations, id, relations[id]?.child);
  return (
    <>
      <p>{label}</p>
      {subtiles.map((tile) => (
        <Tile tile={tile} key={tile.id} />
      ))}
    </>
  );
};

export { Stack };
