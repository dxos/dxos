//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import type { TypedObject } from '@dxos/react-client/echo';
import { DropdownMenu, Input } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-card';
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
    { classNames, isDragging, draggableStyle, draggableProps, item: { id, object }, grow, debug, onSelect, onAction },
    forwardRef,
  ) => {
    if (!object) {
      return <div>INVALID OBJECT</div>;
    }

    // TODO(burdon): Parse schema.
    const label = object.title ?? object.label ?? object.name ?? object.id;
    const handleSetLabel = (label: string) => {
      if (object.title) {
        object.title = label;
      } else if (object.label) {
        object.label = label;
      } else if (object.name) {
        object.name = label;
      }
    };

    const content = object.description?.text ?? object.content?.text;

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
              <DropdownMenu.Item onClick={() => onAction?.({ id, action: 'delete' })}>
                <span className='grow'>Delete</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => onAction?.({ id, action: 'set-color' })}>
                <span className='grow'>Change color</span>
              </DropdownMenu.Item>
            </Card.Menu>
          </Card.Header>
          {(content && (
            <Card.Body gutter classNames={'text-sm text-neutral-500'}>
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
