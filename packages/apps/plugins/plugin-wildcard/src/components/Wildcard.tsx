//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import type { TypedObject } from '@dxos/react-client/echo';
import { Card, DropdownMenu, Input } from '@dxos/react-ui';
import type { MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/react-ui-theme';

export type WildcardProps = {
  id: string;
  object: TypedObject;
};

// TODO(wittjosiah): Instead of title, look for first field with type string.
// TODO(wittjosiah): Instead of JSON view, show some high-level info about the object (e.g. type/icon, description, etc)
//  JSON view can be an advanced secondary view behind an info button.
export const Wildcard: MosaicTileComponent<any> = forwardRef(
  (
    { className, isDragging, draggableStyle, draggableProps, item: { id, object }, grow, onSelect, onAction },
    forwardRef,
  ) => {
    return (
      <div role='none' ref={forwardRef} className='flex w-full' style={draggableStyle}>
        <Card.Root classNames={mx(className, 'w-full snap-center', isDragging && 'opacity-20')} grow={grow}>
          <Card.Header onDoubleClick={() => onSelect?.()}>
            <Card.DragHandle {...draggableProps} />
            {object.title && (
              <Input.Root>
                <Input.TextInput
                  variant='subdued'
                  classNames='p-0'
                  value={object.title}
                  onChange={(event) => (object.title = event.target.value)}
                />
              </Input.Root>
            )}
            <Card.Menu>
              {/* TODO(burdon): Handle events/intents? */}
              <DropdownMenu.Item onClick={() => onAction?.({ id, action: 'delete' })}>
                <span className='grow'>Delete</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => onAction?.({ id, action: 'set-color' })}>
                <span className='grow'>Change color</span>
              </DropdownMenu.Item>
            </Card.Menu>
          </Card.Header>
          <Card.Body>{JSON.stringify(object, null, 2)}</Card.Body>
        </Card.Root>
      </div>
    );
  },
);
