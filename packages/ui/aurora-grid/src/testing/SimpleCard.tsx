//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Card } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import { MosaicTileProps } from '../dnd';

export type SimpleCardProps = { id: string; title?: string; body?: string; image?: string };

export const SimpleCard = forwardRef<HTMLDivElement, MosaicTileProps<SimpleCardProps>>(
  ({ className, draggableStyle, draggableProps, data: { id, title }, debug }, forwardRef) => {
    const full = !title;
    return (
      <Card.Root
        ref={forwardRef}
        style={draggableStyle}
        grow
        noPadding={full}
        classNames={mx(className, 'snap-center')}
      >
        <Card.Header floating={full}>
          <Card.DragHandle position={full ? 'left' : undefined} {...draggableProps} />
          {title && <Card.Title title={title} />}
          <Card.Menu position={full ? 'right' : undefined} />
        </Card.Header>
        {debug && <Card.Body classNames='truncate text-xs text-neutral-400'>{id}</Card.Body>}
      </Card.Root>
    );
  },
);

SimpleCard.displayName = 'SimpleCard';

export const ComplexCard = forwardRef<HTMLDivElement, MosaicTileProps<SimpleCardProps>>(
  ({ className, draggableStyle, draggableProps, data: { id, title, body, image }, onSelect, debug }, forwardRef) => {
    const full = !title;
    return (
      <Card.Root
        ref={forwardRef}
        style={draggableStyle}
        grow
        noPadding={full}
        onDoubleClick={() => onSelect?.()}
        classNames={mx(className, 'snap-center')}
      >
        <Card.Header floating={full}>
          <Card.DragHandle position={full ? 'left' : undefined} {...draggableProps} />
          {title && <Card.Title title={title} />}
          <Card.Menu position={full ? 'right' : undefined} />
        </Card.Header>
        {image && <Card.Media src={image} />}
        {title && body && (
          <Card.Body gutter classNames='line-clamp-3 text-sm'>
            {body}
          </Card.Body>
        )}
        {debug && <Card.Body classNames='truncate text-xs text-neutral-400'>{id}</Card.Body>}
      </Card.Root>
    );
  },
);

ComplexCard.displayName = 'ComplexCard';
