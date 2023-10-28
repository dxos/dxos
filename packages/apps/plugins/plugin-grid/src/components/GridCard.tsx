//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { type Text } from '@dxos/client/echo';
import { Card, DropdownMenu, Input, useTranslation } from '@dxos/react-ui';
import { MarkdownComposer, useTextModel } from '@dxos/react-ui-editor';
import { type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/react-ui-theme';

import { GRID_PLUGIN } from '../types';

export const colors: Record<string, string> = {
  gray: 'bg-neutral-50',
  red: 'bg-indigo-50',
  orange: 'bg-orange-50',
  green: 'bg-teal-50',
  blue: 'bg-cyan-50',
};

type ValueAccessor<TObject extends {}, TValue> = {
  getValue(object: TObject): TValue;
  setValue(object: TObject, value: TValue | undefined): void;
};

export type GridCardProps = { id: string; title?: string; content?: Text; image?: string; color?: string };

export const GridCard: MosaicTileComponent<GridCardProps> = forwardRef(
  ({ className, isDragging, draggableStyle, draggableProps, item, grow, onSelect, onAction }, forwardRef) => {
    const { t } = useTranslation(GRID_PLUGIN);

    console.log(item.id);

    // TODO(burdon): Need lenses (which should be normalized outside of card).
    const titleAccessor: ValueAccessor<GridCardProps, string> = {
      getValue: (object) => (item as any).object?.title ?? object.title ?? '',
      setValue: (object, value) => {
        if ((item as any).object) {
          (item as any).object.title = value;
        } else {
          object.title = value;
        }
      },
    };

    const content = useTextModel({
      text: (item as any).object?.content ?? (item as any).object?.description ?? item.content,
    });

    const color = (item.color && colors[item.color]) ?? colors.gray;

    return (
      <div role='none' ref={forwardRef} className='flex w-full' style={draggableStyle}>
        <Card.Root classNames={mx(className, 'w-full snap-center', color, isDragging && 'opacity-20')} grow={grow}>
          <Card.Header onDoubleClick={() => onSelect?.()}>
            <Card.DragHandle {...draggableProps} />
            <Input.Root>
              <Input.TextInput
                variant='subdued'
                classNames='p-0'
                placeholder={t('title placeholder')}
                value={titleAccessor.getValue(item)}
                onChange={(event) => titleAccessor.setValue(item, event.target.value)}
              />
            </Input.Root>
            <Card.Menu>
              {/* TODO(burdon): Handle events/intents? */}
              <DropdownMenu.Item onClick={() => onAction?.({ id: item.id, action: 'delete' })}>
                <span className='grow'>Delete</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => onAction?.({ id: item.id, action: 'set-color' })}>
                <span className='grow'>Change color</span>
              </DropdownMenu.Item>
            </Card.Menu>
          </Card.Header>
          <Card.Body>
            <MarkdownComposer
              model={content}
              slots={{
                root: {
                  className: mx(
                    'h-full p-1 text-sm',
                    // TODO(burdon): Hack since classname ignored below.
                    '[&>div]:h-full',
                  ),
                },
                editor: { className: 'h-full', placeholder: t('content placeholder') },
              }}
            />
          </Card.Body>
        </Card.Root>
      </div>
    );
  },
);

GridCard.displayName = 'ComplexCard';
