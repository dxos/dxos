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
  ...props
}: Omit<ThemedClassName<ComponentPropsWithoutRef<'div'>>, 'aria-orientation'> & {
  orientation?: StackProps['orientation'];
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
      draggable({ element, getInitialData: () => ({ id }) }),
      // TODO(zanthure): canDrop should have higher standards.
      dropTargetForElements({
        element,
        canDrop: ({ ..._args }) => true,

        getData: ({ input, element }) => {
          return attachClosestEdge(
            { id },
            {
              input,
              element,
              allowedEdges: orientation === 'vertical' ? ['top', 'bottom'] : ['left', 'right'],
            },
          );
        },
        onDragEnter: (args) => {
          setEdge(extractClosestEdge(args.self.data));
        },
        onDrag: (args) => {
          setEdge(extractClosestEdge(args.self.data));
        },
        onDragLeave: () => {
          setEdge(null);
        },
        onDrop: () => {
          setEdge(null);
        },
      }),
    );
  }, [orientation]);

  React.useEffect(() => {
    console.log('Closest edge changed:', closestEdge);
  }, [closestEdge]);

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
