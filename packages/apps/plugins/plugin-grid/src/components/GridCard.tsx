//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { type TextObject } from '@dxos/client/echo';
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

export type GridCardProps = { id: string; title?: string; content?: TextObject; image?: string; color?: string };

export const GridCard: MosaicTileComponent<GridCardProps> = forwardRef(
  ({ className, isDragging, draggableStyle, draggableProps, item, grow, onSelect, onAction }, forwardRef) => {
    const { t } = useTranslation(GRID_PLUGIN);

    // TODO(burdon): Accessor.
    const model = useTextModel({ text: item.content ?? (item as any).object?.description }); // TODO(burdon): Hack (description).

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
                value={item.title ?? (item as any).label ?? ''} // TODO(burdon): Hack (label).
                onChange={(event) => (item.title = event.target.value)}
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
              model={model}
              slots={{
                root: {
                  className: mx(
                    'h-full p-1 text-sm',
                    // TODO(burdon): Hack since classname ignored below.
                    '[&>div]:h-full',
                  ),
                },
                editor: { className: 'h-full ring', placeholder: t('content placeholder') },
              }}
            />
          </Card.Body>
        </Card.Root>
      </div>
    );
  },
);

GridCard.displayName = 'ComplexCard';
