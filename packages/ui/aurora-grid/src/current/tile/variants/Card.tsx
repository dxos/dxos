//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, { forwardRef } from 'react';

import { useMosaicDnd } from '../../dnd';
import { useMosaic, type TileProps } from '../../mosaic';

export type CardTileProps = TileProps & {
  // Overrides
  variant: 'card';
  sortable?: false;
};

export const isCardTile = (tile: TileProps): tile is CardTileProps => tile.variant === 'card';

/**
 * Basic tile that contains a component.
 */
// TODO(burdon): Rename Cell?
const Card = forwardRef<HTMLDivElement, CardTileProps>((tile, forwardedRef) => {
  const { getData, Delegator } = useMosaic();
  const { activeId } = useMosaicDnd();
  const { attributes, listeners, setNodeRef, transform } = useSortable({
    id: tile.id,
    data: tile, // TODO(burdon): Note this is polluted with "sortable" by dnd.
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
