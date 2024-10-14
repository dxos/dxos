//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import React, { type HTMLAttributes, useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';

import { S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { Icon, type ThemedClassName, useControlledValue, useTranslation } from '@dxos/react-ui';
import { ghostHover, mx, groupBorder, groupSurface } from '@dxos/react-ui-theme';

import { DropIndicator } from './DropIndicator';
import { translationKey } from '../../translations';

// TODO(burdon): Ref: https://github.com/alexreardon/pdnd-react-tailwind/blob/main/src/task.tsx

// TODO(burdon): Factor out?
export type BaseItem = { id: string };

export type ListProps<T extends BaseItem> = ThemedClassName<{
  items?: T[];
}> &
  Pick<ItemProps<T>, 'schema' | 'getLabel' | 'onSelect' | 'onDelete'>;

/**
 * Draggable list.
 */
// TODO(burdon): Generalize.
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
          <Item
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

type ItemState =
  | {
      type: 'idle';
    }
  | {
      type: 'preview';
      container: HTMLElement;
    }
  | {
      type: 'is-dragging';
    }
  | {
      type: 'is-dragging-over';
      closestEdge: Edge | null;
    };

const idle: ItemState = { type: 'idle' };

const stateStyles: { [Key in ItemState['type']]?: HTMLAttributes<HTMLDivElement>['className'] } = {
  'is-dragging': 'opacity-50',
};

type ItemProps<T extends BaseItem> = ThemedClassName<{
  schema: S.Schema<T>;
  item: T;
  getLabel: (item: T) => string;
  onSelect?: (field: T) => void;
  onDelete?: (field: T) => void;
}>;

/**
 * Draggable list item.
 */
const Item = <T extends BaseItem>({ classNames, schema, item, getLabel, onSelect, onDelete }: ItemProps<T>) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<ItemState>(idle);
  useEffect(() => {
    const isItem = S.is(schema);
    const element = ref.current;
    invariant(element);
    return combine(
      draggable({
        element,
        getInitialData: () => item,
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({
              x: '0px',
              y: '0px',
            }),
            render: ({ container }) => {
              setState({ type: 'preview', container });
            },
          });
        },
        onDragStart: () => {
          setState({ type: 'is-dragging' });
        },
        onDrop: () => {
          setState(idle);
        },
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => {
          if (source.element === element) {
            return false;
          }
          return isItem(source.data);
        },
        getData: ({ input }) => {
          return attachClosestEdge(item, { element, input, allowedEdges: ['top', 'bottom'] });
        },
        getIsSticky: () => true,
        onDragEnter: ({ self }) => {
          const closestEdge = extractClosestEdge(self.data);
          setState({ type: 'is-dragging-over', closestEdge });
        },
        onDrag: ({ self }) => {
          const closestEdge = extractClosestEdge(self.data);
          setState((current) => {
            if (current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
              return current;
            }
            return { type: 'is-dragging-over', closestEdge };
          });
        },
        onDragLeave: () => {
          setState(idle);
        },
        onDrop: () => {
          setState(idle);
        },
      }),
    );
  }, [item]);

  return (
    <>
      <div className='relative'>
        <div ref={ref} className={mx('flex', classNames, stateStyles[state.type])}>
          <div className='flex items-center justify-center'>
            <Icon icon='ph--dots-six--regular' size={4} />
          </div>
          <div className='flex min-bs-[2.5rem] items-center cursor-pointer' onClick={() => onSelect?.(item)}>
            {getLabel(item)}
          </div>
          <div className='flex items-center justify-center' onClick={() => onDelete?.(item)}>
            <Icon icon='ph--x--regular' classNames='cursor-pointer' size={4} />
          </div>
        </div>
        {state.type === 'is-dragging-over' && state.closestEdge ? <DropIndicator edge={state.closestEdge} /> : null}
      </div>

      {state.type === 'preview'
        ? createPortal(<DragPreview<T> item={item} getLabel={getLabel} />, state.container)
        : null}
    </>
  );
};

const DragPreview = <T extends BaseItem>({ item, getLabel }: Pick<ItemProps<T>, 'item' | 'getLabel'>) => (
  <div className={mx('rounded p-2', groupSurface, groupBorder)}>{getLabel(item)}</div>
);
