//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { type TextObject, type TypedObject } from '@dxos/client/echo';
import { useConfig } from '@dxos/react-client';
import { Card, DropdownMenu, Input, useTranslation } from '@dxos/react-ui';
import { MarkdownComposer, useTextModel } from '@dxos/react-ui-editor';
import { type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/react-ui-theme';

import { GRID_PLUGIN } from '../types';

export const colors: Record<string, string> = {
  gray: 'bg-neutral-50',
  red: 'bg-rose-50',
  indigo: 'bg-indigo-50',
  yellow: 'bg-orange-50',
  green: 'bg-teal-50',
  blue: 'bg-cyan-50',
  // gray: 'bg-neutral-50 border-neutral-200 border shadow-none',
  // red: 'bg-rose-50 border-rose-200 border shadow-none',
  // indigo: 'bg-indigo-50 border-indigo-200 border shadow-none',
  // yellow: 'bg-yellow-50 border-yellow-200 border shadow-none',
  // green: 'bg-teal-50 border-teal-200 border shadow-none',
  // blue: 'bg-cyan-50 border-cyan-200 border shadow-none',
};

// TODO(burdon): Need lenses (which should be normalized outside of card).
export const getObject = (item: any): TypedObject => item.node?.data ?? item.object ?? item;

export type ValueAccessor<TObject extends {}, TValue> = {
  getValue(object: TObject): TValue;
  setValue(object: TObject, value: TValue | undefined): void;
};

export type GridCardProps = { id: string; title?: string; content?: TextObject; image?: string; color?: string };

export const GridCard: MosaicTileComponent<GridCardProps> = forwardRef(
  ({ className, isDragging, draggableStyle, draggableProps, item, grow, onSelect, onAction }, forwardRef) => {
    const { t } = useTranslation(GRID_PLUGIN);

    // TODO(burdon): Factor out images. Use surface?
    const cid = getObject(item)?.cid;
    const config = useConfig();

    const url = cid ? config.values.runtime!.services!.ipfs!.gateway + '/' + cid : undefined;

    const titleAccessor: ValueAccessor<GridCardProps, string> = {
      getValue: (object) => getObject(item).title ?? getObject(item).name ?? '',
      setValue: (object, value) => {
        if ((item as any).object) {
          (item as any).object.title = value;
        } else {
          object.title = value;
        }
      },
    };

    const content = useTextModel({
      text: getObject(item).content ?? getObject(item).description,
    });

    const color = (item.color && colors[item.color]) ?? colors.gray;

    return (
      <div role='none' ref={forwardRef} className='flex w-full' style={draggableStyle}>
        <Card.Root classNames={mx(className, 'w-full snap-center', color, isDragging && 'opacity-20')} grow={grow}>
          <Card.Header onDoubleClick={() => onSelect?.()} floating={!!url}>
            <Card.DragHandle {...draggableProps} position={url ? 'left' : undefined} />
            {!url && (
              <Input.Root>
                <Input.TextInput
                  variant='subdued'
                  classNames='p-0'
                  placeholder={t('title placeholder')}
                  value={titleAccessor.getValue(item)}
                  onChange={(event) => titleAccessor.setValue(item, event.target.value)}
                />
              </Input.Root>
            )}
            <Card.Menu position={url ? 'right' : undefined}>
              {/* TODO(burdon): Handle events/intents? */}
              <DropdownMenu.Item onClick={() => onAction?.({ id: item.id, action: 'delete' })}>
                <span className='grow'>Delete</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => onAction?.({ id: item.id, action: 'set-color' })}>
                <span className='grow'>Change color</span>
              </DropdownMenu.Item>
            </Card.Menu>
          </Card.Header>
          {!url && (
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
          )}
          {url && <Card.Media src={url} />}
        </Card.Root>
      </div>
    );
  },
);

GridCard.displayName = 'ComplexCard';
