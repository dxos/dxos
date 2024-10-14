//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import React, { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';

import { S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { Icon, type ThemedClassName, useControlledValue, useTranslation } from '@dxos/react-ui';
import { ghostHover, mx } from '@dxos/react-ui-theme';

import { translationKey } from '../translations';

// TODO(burdon): Can we infer this?
export type BaseItem = { id: string };

export type ListProps<T extends BaseItem> = ThemedClassName<{
  schema: S.Schema<any>;
  items?: T[];
}> &
  Pick<ItemProps<T>, 'getLabel' | 'onSelect' | 'onDelete'>;

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

        // TODO(burdon): ???
        // console.log(sourceIdx, targetIdx);
        // const element = document.querySelector(`[data-task-id="${sourceData.taskId}"]`);
        // if (element instanceof HTMLElement) {
        //   triggerPostMoveFlash(element);
        // }
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
          <Item key={item.id} item={item} {...props} classNames={['grid grid-cols-[32px_1fr_32px]', ghostHover]} />
        ))}
      </div>
    </div>
  );
};

type ItemProps<T extends BaseItem> = ThemedClassName<{
  item: T;
  getLabel: (item: T) => string;
  onSelect?: (field: T) => void;
  onDelete?: (field: T) => void;
}>;

// TODO(burdon): Render item. https://github.com/alexreardon/pdnd-react-tailwind/blob/main/src/task.tsx
const Item = <T extends BaseItem>({ classNames, item, getLabel, onSelect, onDelete }: ItemProps<T>) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const element = ref.current;
    invariant(element);
    return combine(draggable({ element }));
  }, [item]);

  return (
    <>
      <div className='relative'>
        <div ref={ref} className={mx(classNames)}>
          <div className='flex items-center justify-center'>
            <Icon icon='ph--dots-six--regular' size={4} />
          </div>
          <div className='flex min-bs-[2rem] items-center cursor-pointer' onClick={() => onSelect?.(item)}>
            {getLabel(item)}
          </div>
          <div className='flex items-center justify-center' onClick={() => onDelete?.(item)}>
            <Icon icon='ph--x--regular' classNames='cursor-pointer' size={4} />
          </div>
        </div>
      </div>
    </>
  );
};
