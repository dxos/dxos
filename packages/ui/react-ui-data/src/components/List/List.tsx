//
// Copyright 2024 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import React, { useEffect } from 'react';
import { flushSync } from 'react-dom';

import { S } from '@dxos/effect';
import { type ThemedClassName, useControlledValue, useTranslation } from '@dxos/react-ui';
import { ghostHover, mx } from '@dxos/react-ui-theme';

import { ListItem, type ListItemProps } from './ListItem';
import { translationKey } from '../../translations';

export type BaseItem = { id: string };

export type ListProps<T extends BaseItem> = ThemedClassName<{
  items?: T[];
}> &
  Pick<ListItemProps<T>, 'schema' | 'getLabel' | 'onSelect' | 'onDelete'>;

/**
 * Draggable list.
 * Ref: https://github.com/alexreardon/pdnd-react-tailwind/blob/main/src/task.tsx
 */
// TODO(burdon): Generalize Radix-style with context.
export const List = <T extends BaseItem>({ classNames, schema, items: _items = [], ...props }: ListProps<T>) => {
  const { t } = useTranslation(translationKey);
  const [items, setItems] = useControlledValue<T[]>(_items);
  useEffect(() => {
    const isItem = S.is(schema);
    return monitorForElements({
      canMonitor: ({ source }) => isItem(source.data),
      onDrop: ({ location, source }) => {
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const sourceData = source.data;
        const targetData = target.data;
        if (!isItem(sourceData) || !isItem(targetData)) {
          return;
        }

        const sourceIdx = items.findIndex((item) => item.id === sourceData.id);
        const targetIdx = items.findIndex((item) => item.id === targetData.id);
        if (targetIdx < 0 || sourceIdx < 0) {
          return;
        }

        const closestEdgeOfTarget = extractClosestEdge(targetData);
        flushSync(() => {
          setItems(
            reorderWithEdge({
              list: items,
              startIndex: sourceIdx,
              indexOfTarget: targetIdx,
              closestEdgeOfTarget,
              axis: 'vertical',
            }),
          );
        });
      },
    });
  }, [items]);

  return (
    <div className='w-full'>
      <div className='grid grid-cols-[32px_1fr_32px]'>
        <div />
        <div className='text-sm'>{t('field path label')}</div>
      </div>
      <div role='list' className={mx('flex flex-col w-full', classNames)}>
        {items.map((item) => (
          <ListItem
            key={item.id}
            {...props}
            schema={schema}
            item={item}
            classNames={['grid grid-cols-[32px_1fr_32px]', ghostHover]}
          />
        ))}
      </div>
    </div>
  );
};
