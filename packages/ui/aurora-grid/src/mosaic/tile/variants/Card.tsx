//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, { forwardRef } from 'react';

import { useMosaicDnd } from '../../dnd';
import { useMosaic } from '../../mosaic';
import { TileSharedProps } from '../types';

export type CardTile = TileSharedProps & {
  // Overrides
  variant: 'card';
  sortable?: false;
};

const Card = forwardRef<HTMLDivElement, CardTile>((tile, forwardedRef) => {
  const { getData, Delegator } = useMosaic();
  const { activeId } = useMosaicDnd();
  const { attributes, listeners, setNodeRef, transform } = useSortable({
    id: tile.id,
    data: tile,
  });

  const isActive = activeId === tile.id;
  const ref = useComposedRefs(setNodeRef, forwardedRef);
  return (
    <Delegator
      data={getData(tile.id)}
      tile={tile}
      dragHandleAttributes={attributes}
      dragHandleListeners={listeners}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: activeId ? 'transform 200ms ease' : 'none',
      }}
      isActive={isActive}
      isPreview={tile.isPreview}
      ref={ref}
    />
  );
});

export { Card };
