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
import React, { useRef, useState, type ComponentPropsWithoutRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type StackProps } from './Stack';

export const StackItem = ({
  children,
  classNames,
  orientation,
  container,
  ...props
}: Omit<ThemedClassName<ComponentPropsWithoutRef<'div'>>, 'aria-orientation'> & {
  orientation?: StackProps['orientation'];
  container?: string;
}) => {
  const id = 'change-me';
  const ref = useRef<HTMLDivElement>(null);
  const [closestEdge, setEdge] = useState<Edge | null>(null);

  React.useEffect(() => {
    if (!ref.current) {
      return;
    }

    const element = ref.current;

    return combine(
      draggable({ element, getInitialData: () => ({ id, container }) }),
      // TODO(zanthure): canDrop should have higher standards.
      dropTargetForElements({
        element,
        canDrop: ({ ..._args }) => true,
        getData: ({ input, element }) => {
          return attachClosestEdge(
            { id, container },
            { input, element, allowedEdges: orientation === 'vertical' ? ['top', 'bottom'] : ['left', 'right'] },
          );
        },
        onDragEnter: ({ self, source }) => {
          if (source.data.container === self.data.container) {
            setEdge(extractClosestEdge(self.data));
          }
        },
        onDrag: ({ self, source }) => {
          if (source.data.container === self.data.container) {
            setEdge(extractClosestEdge(self.data));
          }
        },
        onDragLeave: () => {
          setEdge(null);
        },
        onDrop: () => {
          setEdge(null);
        },
      }),
    );
  }, [orientation, container, id, ref]);

  return (
    <div
      ref={ref}
      className={mx('relative', orientation === 'horizontal' ? 'grid-cols-subgrid' : 'grid-rows-subgrid', classNames)}
      {...props}
    >
      {children}
      {closestEdge && <DropIndicator edge={closestEdge} />}
    </div>
  );
};
