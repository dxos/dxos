//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Card } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import { DraggableProps } from '../dnd';

export type SimpleCardProps = { id: string; title?: string; body?: string; image?: string };

export const SimpleCard = forwardRef<HTMLDivElement, DraggableProps<SimpleCardProps>>(
  ({ className, draggableStyle, draggableProps, data: { title, body, image }, onSelect }, forwardRef) => {
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
        {image && <Card.Media src={image} />}
      </Card.Root>
    );
  },
);
