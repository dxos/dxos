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
    // The stack carries a selection, so a reader arrows between frames (and Enter picks one).
    <OrderedList.Root<T>
      items={items}
      getId={getId}
      onMove={onMove}
      // A clone of the row: it carries the resolved thumbnail, which a fresh render would still be loading.
      dragPreview='clone'
      navigationMode='listbox'
    >
      {({ items }) => (
        // `select-none`: a pointer drag across the previews would otherwise start a native text
        // selection drag, whose ghost is the whole column.
        <OrderedList.Content classNames={['flex flex-col gap-3 p-3 select-none', classNames]}>
          {items.map((item, index) => (
            <OrderedList.Item
              key={item.id}
              id={item.id}
              item={item}
              hover
              selected={item.id === selectedId}
              classNames='p-1 rounded-sm cursor-pointer dx-selected dx-focus-ring-inset aria-selected:ring-2 aria-selected:ring-accent-bg'
              onClick={() => onSelect?.(item.id)}
            >
              {/* The preview itself is the handle: the thumbnail is what a reader expects to grab. */}
              <OrderedList.DragHandle asChild>
                <div className='min-w-0 cursor-grab data-[disabled]:cursor-default'>{children(item, index)}</div>
              </OrderedList.DragHandle>
            </OrderedList.Item>
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );
};

FrameStack.displayName = 'FrameStack';
