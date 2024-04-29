//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { DropdownMenu, Input } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-card';
import type { MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/react-ui-theme';

const Wildcard: MosaicTileComponent<any> = forwardRef(
  (
    { classNames, isDragging, draggableStyle, draggableProps, item: object, grow, debug, onSelect, onAction },
    forwardRef,
  ) => {
    if (!object) {
      return <div>INVALID OBJECT</div>;
    }

    // TODO(burdon): Parse schema.
    const label = object.title ?? object.label ?? object.name;
    const content = object.description ?? object.content;

    const handleSetLabel = (label: string) => {
      if (object.title) {
        object.title = label;
      } else if (object.label) {
        object.label = label;
      } else if (object.name) {
        object.name = label;
      }
    };

    // TODO(burdon): Should this include the drag handle or just the content?
    return (
      <div role='none' ref={forwardRef} className='flex w-full' style={draggableStyle}>
        <Card.Root classNames={mx('w-full snap-center', isDragging && 'opacity-20', classNames)} grow={grow}>
          <Card.Header onDoubleClick={() => onSelect?.()}>
            <Card.DragHandle {...draggableProps} />
            {label && (
              <Input.Root>
                <Input.TextInput
                  variant='subdued'
                  classNames='p-0'
                  value={label}
                  onChange={(event) => handleSetLabel(event.target.value)}
                />
              </Input.Root>
            )}
            <Card.Menu>
              {/* TODO(burdon): Handle events/intents? */}
              <DropdownMenu.Item onClick={() => onAction?.({ id: object.id, action: 'delete' })}>
                <span className='grow'>Delete</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => onAction?.({ id: object.id, action: 'set-color' })}>
                <span className='grow'>Change color</span>
              </DropdownMenu.Item>
            </Card.Menu>
          </Card.Header>
          {(content && (
            <Card.Body gutter classNames={'pb-2 text-sm text-neutral-500'}>
              {content}
            </Card.Body>
          )) ||
            (debug && (
              <Card.Body classNames={'text-xs whitespace-break-spaces break-all text-neutral-500'}>
                {JSON.stringify(object, null, 2)}
              </Card.Body>
            ))}
        </Card.Root>
      </div>
    );
  },
);

export default Wildcard;
