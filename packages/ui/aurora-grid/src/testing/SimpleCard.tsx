//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Card } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import { Mosaic, MosaicTileComponent } from '../mosaic';

export type SimpleCardProps = { id: string; title?: string; body?: string; image?: string };

export const SimpleCard: MosaicTileComponent<SimpleCardProps> = forwardRef(
  (
    { className, isDragging, draggableStyle, draggableProps, item: { id, title }, container, position, grow, debug },
    forwardRef,
  ) => {
    const full = !title;
    return (
      <Card.Root
        ref={forwardRef}
        style={draggableStyle}
        noPadding={full}
        classNames={mx(className, 'snap-center', isDragging && 'opacity-20')}
        grow={grow}
      >
        <Card.Header floating={full}>
          <Card.DragHandle position={full ? 'left' : undefined} {...draggableProps} />
          {title && <Card.Title title={title} />}
          <Card.Menu position={full ? 'right' : undefined} />
        </Card.Header>
        {debug && (
          <Card.Body>
            <Mosaic.Debug data={{ container, id, position }} />
          </Card.Body>
        )}
      </Card.Root>
    );
  },
);

SimpleCard.displayName = 'SimpleCard';

export const ComplexCard: MosaicTileComponent<SimpleCardProps> = forwardRef(
  (
    {
      className,
      isDragging,
      draggableStyle,
      draggableProps,
      item: { id, title, body, image },
      container,
      onSelect,
      grow,
      debug,
    },
    forwardRef,
  ) => {
    const full = !title;
    return (
      <Card.Root
        ref={forwardRef}
        style={draggableStyle}
        noPadding={full}
        classNames={mx(className, 'snap-center', isDragging && 'opacity-20')}
        grow={grow}
        onDoubleClick={() => onSelect?.()}
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
        {debug && (
          <Card.Body>
            <Mosaic.Debug data={{ container, id }} />
          </Card.Body>
        )}
      </Card.Root>
    );
  },
);

ComplexCard.displayName = 'ComplexCard';
