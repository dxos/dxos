//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Card, Input, useTranslation } from '@dxos/aurora';
import { MarkdownComposer, useTextModel } from '@dxos/aurora-composer';
import { type MosaicTileComponent } from '@dxos/aurora-grid/next';
import { mx } from '@dxos/aurora-theme';
import { type Text } from '@dxos/client/echo';

import { GRID_PLUGIN } from '../types';

export type SimpleCardProps = { id: string; title?: string; content?: Text; image?: string };

export const GridCard: MosaicTileComponent<SimpleCardProps> = forwardRef(
  ({ className, isDragging, draggableStyle, draggableProps, item, grow, onSelect }, forwardRef) => {
    const { t } = useTranslation(GRID_PLUGIN);
    const model = useTextModel({ text: item.content });

    // TODO(burdon): Card prop.
    const color = 'bg-green-50';

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
                value={item.title ?? ''}
                onChange={(event) => (item.title = event.target.value)}
              />
            </Input.Root>
            <Card.Menu />
          </Card.Header>
          <Card.Body classNames='text-sm'>
            <MarkdownComposer
              slots={{ root: { className: 'p-1' }, editor: { placeholder: t('content placeholder') } }}
              model={model}
            />
          </Card.Body>
        </Card.Root>
      </div>
    );
  },
);

GridCard.displayName = 'ComplexCard';
