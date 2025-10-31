//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { useLayoutEffect, useState } from 'react';

import { type Orientation, type StackItemData, type StackItemRearrangeHandler } from '../components';

/**
 * Hook to handle drag and drop functionality for Stack components.
 */
export const useStackDropForElements = ({
  id,
  element,
  scrollElement = element,
  selfDroppable,
  orientation,
  onRearrange,
}: {
  id?: string;
  element: HTMLDivElement | null;
  scrollElement?: HTMLDivElement | null;
  selfDroppable: boolean;
  orientation: Orientation;
  onRearrange?: StackItemRearrangeHandler;
}) => {
  const [dropping, setDropping] = useState(false);

  useLayoutEffect(() => {
    if (!element || !selfDroppable) {
      return;
    }

    const acceptSourceType = orientation === 'horizontal' ? 'column' : 'card';

    return combine(
      dropTargetForElements({
        element,
        getData: ({ input, element }) => {
          return attachClosestEdge(
            { id, type: orientation === 'horizontal' ? 'card' : 'column' },
            { input, element, allowedEdges: [orientation === 'horizontal' ? 'left' : 'top'] },
          );
        },
        onDragEnter: ({ source }) => {
          if (source.data.type === acceptSourceType) {
            setDropping(true);
          }
        },
        onDrag: ({ source }) => {
          if (source.data.type === acceptSourceType) {
            setDropping(true);
          }
        },
        onDragLeave: () => {
          return setDropping(false);
        },
        onDrop: ({ self, source }) => {
          setDropping(false);
          if (source.data.type === acceptSourceType && selfDroppable && onRearrange) {
            onRearrange(source.data as StackItemData, self.data as StackItemData, extractClosestEdge(self.data));
          }
        },
      }),
      orientation
        ? autoScrollForElements({
            element: scrollElement as Element,
            getAllowedAxis: () => orientation,
          })
        : () => {},
    );
  }, [element, scrollElement, selfDroppable, orientation, id, onRearrange]);

  return { dropping };
};
