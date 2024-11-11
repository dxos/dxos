//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { useLayoutEffect, useState, createContext, type ComponentPropsWithoutRef, useContext } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStack } from './Stack';

export type StackItemSize = number | 'min-content';
export const DEFAULT_HORIZONTAL_SIZE = 44 satisfies StackItemSize;
export const DEFAULT_VERTICAL_SIZE = 'min-content' satisfies StackItemSize;

export type StackItemData = { id: string; type: 'column' | 'card' };

export type StackItemProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  item: Omit<StackItemData, 'type'>;
  onRearrange: (source: StackItemData, target: StackItemData, closestEdge: Edge | null) => void;
  size?: StackItemSize;
  onSizeChange?: (nextSize: StackItemSize) => void;
  defaultSize?: StackItemSize;
};

type StackItemContextValue = {
  selfDragHandleRef: (element: HTMLDivElement | null) => void;
  size: StackItemSize;
  setSize: (nextSize: StackItemSize) => void;
};

const StackItemContext = createContext<StackItemContextValue>({
  selfDragHandleRef: () => {},
  size: 'min-content',
  setSize: () => {},
});

const useStackItem = () => useContext(StackItemContext);

export const StackItem = ({
  item,
  children,
  classNames,
  onRearrange,
  size: propsSize,
  onSizeChange,
  defaultSize,
  style,
  ...props
}: StackItemProps) => {
  const [itemElement, itemRef] = useState<HTMLDivElement | null>(null);
  const [selfDragHandleElement, selfDragHandleRef] = useState<HTMLDivElement | null>(null);
  const [closestEdge, setEdge] = useState<Edge | null>(null);
  const { orientation, rail, separators } = useStack();
  const [size = orientation === 'horizontal' ? DEFAULT_HORIZONTAL_SIZE : DEFAULT_VERTICAL_SIZE, setSize] =
    useControllableState({
      prop: propsSize,
      onChange: onSizeChange,
      defaultProp: defaultSize,
    });

  const type = orientation === 'horizontal' ? 'column' : 'card';

  useLayoutEffect(() => {
    if (!itemElement || !onRearrange) {
      return;
    }

    return combine(
      draggable({
        element: itemElement,
        ...(selfDragHandleElement && { dragHandle: selfDragHandleElement }),
        getInitialData: () => ({ id: item.id, type }),
      }),
      dropTargetForElements({
        element: itemElement,
        getData: ({ input, element }) => {
          return attachClosestEdge(
            { id: item.id, type },
            { input, element, allowedEdges: orientation === 'horizontal' ? ['left', 'right'] : ['top', 'bottom'] },
          );
        },
        onDragEnter: ({ self, source }) => {
          if (source.data.type === self.data.type) {
            setEdge(extractClosestEdge(self.data));
          }
        },
        onDrag: ({ self, source }) => {
          if (source.data.type === self.data.type) {
            setEdge(extractClosestEdge(self.data));
          }
        },
        onDragLeave: () => setEdge(null),
        onDrop: ({ self, source }) => {
          setEdge(null);
          if (source.data.type === self.data.type) {
            onRearrange(source.data as StackItemData, self.data as StackItemData, extractClosestEdge(self.data));
          }
        },
      }),
    );
  }, [orientation, item, onRearrange, selfDragHandleElement, itemElement]);

  return (
    <StackItemContext.Provider value={{ selfDragHandleRef, size, setSize }}>
      <div
        {...props}
        className={mx(
          'grid relative',
          size === 'min-content' && (orientation === 'horizontal' ? 'is-min' : 'bs-min'),
          orientation === 'horizontal' ? 'grid-rows-subgrid' : 'grid-cols-subgrid',
          rail && (orientation === 'horizontal' ? 'row-span-2' : 'col-span-2'),
          separators && 'gap-px',
          classNames,
        )}
        style={{
          ...(size !== 'min-content' && { [orientation === 'horizontal' ? 'inlineSize' : 'blockSize']: `${size}rem` }),
          ...style,
        }}
        ref={itemRef}
      >
        {children}
        {closestEdge && <DropIndicator edge={closestEdge} />}
      </div>
    </StackItemContext.Provider>
  );
};

export const StackItemHeading = () => {
  const { orientation, separators } = useStack();
  const { selfDragHandleRef } = useStackItem();
  return (
    <div
      role='heading'
      className={mx(orientation === 'horizontal' ? 'bs-[--rail-size]' : 'is-[--rail-size]', separators && 'bg-base')}
      ref={selfDragHandleRef}
    />
  );
};
