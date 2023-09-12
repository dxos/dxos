//
// Copyright 2023 DXOS.org
//
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical } from '@phosphor-icons/react';
import React from 'react';

import { Button } from '@dxos/aurora';
import { groupSurface, mx, surfaceElevation } from '@dxos/aurora-theme';

import { TileProps } from '../types';

const Card = ({ tile, draggable }: TileProps) => {
  const { id, label } = tile;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    data: tile,
  });
  return (
    <div
      role='group'
      className={mx(groupSurface, surfaceElevation({ elevation: 'group' }), 'rounded m-2')}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      ref={setNodeRef}
    >
      {draggable && (
        <Button variant='ghost' {...attributes} {...listeners}>
          <DotsSixVertical />
        </Button>
      )}
      <p>{label}</p>
    </div>
  );
};

export { Card };
