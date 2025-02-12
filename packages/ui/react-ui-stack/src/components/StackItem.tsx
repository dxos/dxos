//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { useFocusableGroup } from '@fluentui/react-tabster';
import { composeRefs } from '@radix-ui/react-compose-refs';
import React, { forwardRef, useLayoutEffect, useState, type ComponentPropsWithRef, useCallback } from 'react';

import { type ThemedClassName, ListItem } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStack, StackItemContext, type StackItemSize, type StackItemData } from './StackContext';
import { StackItemContent, type StackItemContentProps } from './StackItemContent';
import { StackItemDragHandle, type StackItemDragHandleProps } from './StackItemDragHandle';
import {
  StackItemHeading,
  StackItemHeadingLabel,
  type StackItemHeadingProps,
  type StackItemHeadingLabelProps,
} from './StackItemHeading';
import { StackItemResizeHandle, type StackItemResizeHandleProps } from './StackItemResizeHandle';
import {
  StackItemSigil,
  type StackItemSigilProps,
  type StackItemSigilAction,
  type StackItemSigilButtonProps,
  StackItemSigilButton,
} from './StackItemSigil';

export const DEFAULT_HORIZONTAL_SIZE = 44 satisfies StackItemSize;
export const DEFAULT_VERTICAL_SIZE = 'min-content' satisfies StackItemSize;
export const DEFAULT_EXTRINSIC_SIZE = DEFAULT_HORIZONTAL_SIZE satisfies StackItemSize;

export type StackItemRootProps = ThemedClassName<ComponentPropsWithRef<'div'>> & {
  item: Omit<StackItemData, 'type'>;
  order?: number;
  size?: StackItemSize;
  onSizeChange?: (nextSize: StackItemSize) => void;
  role?: 'article' | 'section';
};

const StackItemRoot = forwardRef<HTMLDivElement, StackItemRootProps>(
  ({ item, children, classNames, size: propsSize, onSizeChange, role, order, style, ...props }, forwardedRef) => {
    const [itemElement, itemRef] = useState<HTMLDivElement | null>(null);
    const [selfDragHandleElement, selfDragHandleRef] = useState<HTMLDivElement | null>(null);
    const [closestEdge, setEdge] = useState<Edge | null>(null);
    const { orientation, rail, onRearrange } = useStack();
    const [size = orientation === 'horizontal' ? DEFAULT_HORIZONTAL_SIZE : DEFAULT_VERTICAL_SIZE, setInternalSize] =
      useState(propsSize);

    const Root = role ?? 'div';

    const composedItemRef = composeRefs<HTMLDivElement>(itemRef, forwardedRef);

    const setSize = useCallback(
      (nextSize: StackItemSize, commit?: boolean) => {
        setInternalSize(nextSize);
        if (commit) {
          onSizeChange?.(nextSize);
        }
      },
      [onSizeChange],
    );

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
          // TODO(thure): tabster focus honeypots are causing the preview to render with the wrong dimensions; what do?
          onGenerateDragPreview: ({ nativeSetDragImage }) => {
            disableNativeDragPreview({ nativeSetDragImage });
            preventUnhandled.start();
          },
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

    const focusGroupAttrs = useFocusableGroup({ tabBehavior: 'limited' });

    return (
      <StackItemContext.Provider value={{ selfDragHandleRef, size, setSize }}>
        <Root
          {...props}
          tabIndex={0}
          {...focusGroupAttrs}
          className={mx(
            'group/stack-item grid relative dx-focus-ring-inset-over-all',
            size === 'min-content' && (orientation === 'horizontal' ? 'is-min' : 'bs-min'),
            orientation === 'horizontal' ? 'grid-rows-subgrid' : 'grid-cols-subgrid',
            rail && (orientation === 'horizontal' ? 'row-span-2' : 'col-span-2'),
            classNames,
          )}
          data-dx-stack-item
          style={{
            ...(size !== 'min-content' && {
              [orientation === 'horizontal' ? 'inlineSize' : 'blockSize']: `${size}rem`,
            }),
            ...(Number.isFinite(order) && {
              [orientation === 'horizontal' ? 'gridColumn' : 'gridRow']: `${order}`,
            }),
            ...style,
          }}
          ref={composedItemRef}
        >
          {children}
          {closestEdge && <ListItem.DropIndicator edge={closestEdge} />}
        </Root>
      </StackItemContext.Provider>
    );
  },
);

export const StackItem = {
  Root: StackItemRoot,
  Content: StackItemContent,
  Heading: StackItemHeading,
  HeadingLabel: StackItemHeadingLabel,
  ResizeHandle: StackItemResizeHandle,
  DragHandle: StackItemDragHandle,
  Sigil: StackItemSigil,
  SigilButton: StackItemSigilButton,
};

export type {
  StackItemContentProps,
  StackItemHeadingProps,
  StackItemHeadingLabelProps,
  StackItemResizeHandleProps,
  StackItemDragHandleProps,
  StackItemSigilProps,
  StackItemSigilButtonProps,
  StackItemSigilAction,
};
