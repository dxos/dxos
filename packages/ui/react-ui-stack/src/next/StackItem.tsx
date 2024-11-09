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
import React, { useEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStack } from './Stack';

export type StackItemProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  item: { id: string };
  onReorder: (sourceId: string, targetId: string, closestEdge: Edge | null) => void;
};

export const StackItem = ({ item, children, classNames, onReorder, ...props }: StackItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [closestEdge, setEdge] = useState<Edge | null>(null);
  const { orientation, rail } = useStack();
  const type = orientation === 'horizontal' ? 'column' : 'card';

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const element = ref.current;

    return combine(
      draggable({ element, getInitialData: () => ({ id: item.id, type }) }),
      dropTargetForElements({
        element,
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
            onReorder(source.data.id as string, self.data.id as string, extractClosestEdge(self.data));
          }
        },
      }),
    );
  }, [orientation, item, onReorder]);

  return (
    <div
      ref={ref}
      className={mx(
        'grid relative is-min',
        orientation === 'horizontal' ? 'grid-rows-subgrid' : 'grid-cols-subgrid',
        rail && (orientation === 'horizontal' ? 'row-span-2' : 'col-span-2'),
        classNames,
      )}
      {...props}
    >
      {children}
      {closestEdge && <DropIndicator edge={closestEdge} />}
    </div>
  );
};

export const StackItemHeading = () => {
  const { orientation } = useStack();
  return <div role='heading' className={orientation === 'horizontal' ? 'bs-[--rail-size]' : 'is-[--rail-size]'} />;
};
