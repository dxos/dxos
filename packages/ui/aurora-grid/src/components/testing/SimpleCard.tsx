//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Card } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import { MosaicTileProps } from '../../dnd';

export type SimpleCardProps = { id: string; title?: string; body?: string; image?: string };

export const SimpleCard = forwardRef<HTMLDivElement, MosaicTileProps<SimpleCardProps>>(
  (
    { className, draggableStyle, draggableProps, data: { id, title, body, image }, onSelect, debug = true },
    forwardRef,
  ) => {
    const full = !title && !body;
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
        {body && (
          <Card.Body gutter classNames='line-clamp-3'>
            {body}
          </Card.Body>
        )}
        {debug && (
          <Card.Body gutter classNames='text-xs'>
            {id}
          </Card.Body>
        )}
        {image && <Card.Media src={image} />}
      </Card.Root>
    );
  },
);
