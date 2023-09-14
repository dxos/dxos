//
// Copyright 2023 DXOS.org
//
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, { forwardRef } from 'react';

import { useMosaic, useMosaicData, useMosaicDnd } from '../mosaic';
import { CardTile } from '../types';

const Card = forwardRef<HTMLDivElement, CardTile>((tile, forwardedRef) => {
  const { Delegator } = useMosaic();
  const { [tile.id]: cardData } = useMosaicData();
  const { activeId } = useMosaicDnd();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: tile.isOverlay ? `${tile.id}--overlay` : tile.id,
    data: tile,
  });
  const ref = useComposedRefs(setNodeRef, forwardedRef);
  return (
    <Delegator
      data={cardData}
      tile={tile}
      dragHandleAttributes={attributes}
      dragHandleListeners={listeners}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        ...(activeId === tile.id && { opacity: 0 }),
      }}
      ref={ref}
    />
  );
});

export { Card };
