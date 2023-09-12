//
// Copyright 2023 DXOS.org
//
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from 'react';

import { groupSurface, mx, surfaceElevation } from '@dxos/aurora-theme';

import { useMosaic } from '../mosaic';
import { TileProps } from '../types';

const Card = ({ tile }: TileProps) => {
  const { id } = tile;
  const { data, Delegator } = useMosaic();
  const content = data[tile.id];
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    data: tile,
  });
  return (
    <div
      role='group'
      className={mx(groupSurface, surfaceElevation({ elevation: 'group' }), 'rounded m-2 relative')}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      ref={setNodeRef}
    >
      <Delegator data={content} tileVariant='card' dragHandleAttributes={attributes} dragHandleListeners={listeners} />
    </div>
  );
};

export { Card };
