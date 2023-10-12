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
    {
      className,
      isDragging,
      draggableStyle,
      draggableProps,
      item: { id, title },
      path,
      position,
      grow,
      debug,
      onSelect,
    },
    forwardRef,
  ) => {
    const full = !title;
    return (
      <div role='none' ref={forwardRef} className='flex w-full' style={draggableStyle}>
        <Card.Root
          noPadding={full}
          classNames={mx(className, 'w-full snap-center', isDragging && 'opacity-20')}
          grow={grow}
        >
          <Card.Header floating={full} onDoubleClick={() => onSelect?.()}>
            <Card.DragHandle position={full ? 'left' : undefined} {...draggableProps} />
            {title && <Card.Title title={title} />}
            <Card.Menu position={full ? 'right' : undefined} />
          </Card.Header>
          {debug && (
            <Card.Body>
              <Mosaic.Debug data={{ path, id, position }} />
            </Card.Body>
          )}
        </Card.Root>
      </div>
    );
  },
);

SimpleCard.displayName = 'SimpleCard';

export const ComplexCard: MosaicTileComponent<SimpleCardProps> = forwardRef(
  (
    { className, isDragging, draggableStyle, draggableProps, item: { id, title, body, image }, grow, debug, onSelect },
    forwardRef,
  ) => {
    const full = !title;
    return (
      <div role='none' ref={forwardRef} className='flex w-full' style={draggableStyle}>
        <Card.Root
          noPadding={full}
          classNames={mx(className, 'w-full snap-center', isDragging && 'opacity-20')}
          grow={grow}
        >
          <Card.Header floating={full} onDoubleClick={() => onSelect?.()}>
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
              <Mosaic.Debug data={{ id }} />
            </Card.Body>
          )}
        </Card.Root>
      </div>
    );
  },
);

ComplexCard.displayName = 'ComplexCard';
