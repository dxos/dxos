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
  orientation,
  selfDroppable,
  onRearrange,
}: {
  id?: string;
  element: HTMLDivElement | null;
  scrollElement?: HTMLDivElement | null;
  orientation: Orientation;
  selfDroppable: boolean;
  onRearrange?: StackItemRearrangeHandler;
}) => {
  const [dropping, setDropping] = useState(false);

  useLayoutEffect(() => {
    if (!element) {
      return;
    }

    const acceptSourceType = orientation === 'horizontal' ? 'column' : 'card';

    return combine(
      autoScrollForElements({
        element: scrollElement!,
        getAllowedAxis: () => orientation,
      }),

      selfDroppable
        ? dropTargetForElements({
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
          })
        : () => {},
    );
  }, [element, scrollElement, selfDroppable, orientation, id, onRearrange]);

  return { dropping };
};
