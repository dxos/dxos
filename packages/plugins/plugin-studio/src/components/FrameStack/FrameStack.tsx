//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useCallback } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { OrderedList } from '@dxos/react-ui-list';

export type FrameStackItem = { id: string };

export type FrameStackProps<T extends FrameStackItem> = ThemedClassName<{
  items: readonly T[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onMove?: (fromIndex: number, toIndex: number) => void;
  /** Renders an item's preview; the stack supplies the row, its handle and its selection. */
  children: (item: T, index: number) => ReactNode;
}>;

/**
 * A vertical, reorderable stack of frame previews with one selected — the master column of a
 * storyboard. Presentation-only: the parent owns the items, the selection and the reorder.
 */
export const FrameStack = <T extends FrameStackItem>({
  classNames,
  items,
  selectedId,
  onSelect,
  onMove,
  children,
}: FrameStackProps<T>) => {
  const getId = useCallback((item: T) => item.id, []);
  return (
    // The stack carries a selection, so a reader arrows between frames rather than their handles.
    <OrderedList.Root<T> items={items} getId={getId} onMove={onMove} navigationMode='listbox'>
      {({ items }) => (
        <OrderedList.Content classNames={['flex flex-col gap-1 p-1', classNames]}>
          {items.map((item, index) => (
            <OrderedList.Item
              key={item.id}
              id={item.id}
              item={item}
              hover
              selected={item.id === selectedId}
              classNames='flex items-start gap-1 p-1 rounded-sm cursor-pointer'
              onClick={() => onSelect?.(item.id)}
            >
              <OrderedList.DragHandle />
              <div className='grow min-w-0'>{children(item, index)}</div>
            </OrderedList.Item>
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );
};

FrameStack.displayName = 'FrameStack';
