//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { TileRequiredProps } from '../../props';
import { Tile } from '../../tiles';

export type StackTile = TileRequiredProps;

export type StackProps<T extends StackTile> = {
  tiles?: T[];
};

// TODO(burdon): External DndContext.
// TODO(burdon): DndSort.
export const Stack = <T extends StackTile>({ tiles = [] }: StackProps<T>) => {
  return (
    <div className='flex flex-col bg-white'>
      {tiles.map((tile) => (
        <div key={tile.id} className='m-2 border'>
          <Tile<T> tile={tile} />
        </div>
      ))}
    </div>
  );
};
