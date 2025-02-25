//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { DropdownMenu, Input, type ThemedClassName } from '@dxos/react-ui';
import { Card, type CardRootProps } from '@dxos/react-ui-card';
import { mx } from '@dxos/react-ui-theme';

type WildcardProps = ThemedClassName<
  ComponentPropsWithRef<'div'> & {
    item: { id: string; [key: string]: any };
    onSelect?: () => void;
    onAction?: (arg: any) => void;
    debug?: boolean;
  } & Pick<CardRootProps, 'grow'>
>;

const Wildcard = forwardRef<HTMLDivElement, WildcardProps>(
  ({ classNames, item: object, grow, onSelect, onAction, debug }, forwardRef) => {
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
      <div role='none' ref={forwardRef} className='flex w-full'>
        <Card.Root classNames={mx('w-full snap-center', classNames)} grow={grow}>
          <Card.Header onDoubleClick={() => onSelect?.()}>
            <Card.DragHandle />
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
