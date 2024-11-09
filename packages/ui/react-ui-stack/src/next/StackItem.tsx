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
import React, { useLayoutEffect, useState, createContext, type ComponentPropsWithoutRef, useContext } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStack } from './Stack';

export type StackItemData = { id: string; type: 'column' | 'card' };

export type StackItemProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  item: Omit<StackItemData, 'type'>;
  onReorder: (source: StackItemData, target: StackItemData, closestEdge: Edge | null) => void;
};

type StackItemContextValue = {
  dragHandleRef: (element: HTMLDivElement | null) => void;
};

const StackItemContext = createContext<StackItemContextValue>({ dragHandleRef: () => {} });

const useStackItem = () => useContext(StackItemContext);

export const StackItem = ({ item, children, classNames, onReorder, ...props }: StackItemProps) => {
  const [itemElement, itemRef] = useState<HTMLDivElement | null>(null);
  const [dragHandleElement, dragHandleRef] = useState<HTMLDivElement | null>(null);
  const [closestEdge, setEdge] = useState<Edge | null>(null);
  const { orientation, rail, separators } = useStack();
  const type = orientation === 'horizontal' ? 'column' : 'card';

  useLayoutEffect(() => {
    if (!itemElement) {
      return;
    }

    return combine(
      draggable({
        element: itemElement,
        ...(dragHandleElement && { dragHandle: dragHandleElement }),
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
            onReorder(source.data as StackItemData, self.data as StackItemData, extractClosestEdge(self.data));
          }
        },
      }),
    );
  }, [orientation, item, onReorder, dragHandleElement, itemElement]);

  return (
    <StackItemContext.Provider value={{ dragHandleRef }}>
      <div
        className={mx(
          'grid relative is-min',
          orientation === 'horizontal' ? 'grid-rows-subgrid' : 'grid-cols-subgrid',
          rail && (orientation === 'horizontal' ? 'row-span-2' : 'col-span-2'),
          separators && 'gap-px',
          classNames,
        )}
        {...props}
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
  const { dragHandleRef } = useStackItem();
  return (
    <div
      role='heading'
      className={mx(orientation === 'horizontal' ? 'bs-[--rail-size]' : 'is-[--rail-size]', separators && 'bg-base')}
      ref={dragHandleRef}
    />
  );
};
