//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import React, { type HTMLAttributes, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx, groupBorder, groupSurface } from '@dxos/react-ui-theme';

import { DropIndicator } from './DropIndicator';
import { type BaseItem, idle, type ItemState } from './styles';

const stateStyles: { [Key in ItemState['type']]?: HTMLAttributes<HTMLDivElement>['className'] } = {
  'is-dragging': 'opacity-50',
};

export type ListItemProps<T extends BaseItem> = ThemedClassName<{
  schema: S.Schema<T>;
  item: T;
  getLabel: (item: T) => string;
  onSelect?: (field: T) => void;
  onDelete?: (field: T) => void;
}>;

/**
 * Draggable list item.
 */
export const ListItem = <T extends BaseItem>({
  classNames,
  schema,
  item,
  getLabel,
  onSelect,
  onDelete,
}: ListItemProps<T>) => {
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

const DragPreview = <T extends BaseItem>({ item, getLabel }: Pick<ListItemProps<T>, 'item' | 'getLabel'>) => (
  <div className={mx('rounded p-2', groupSurface, groupBorder)}>{getLabel(item)}</div>
);
