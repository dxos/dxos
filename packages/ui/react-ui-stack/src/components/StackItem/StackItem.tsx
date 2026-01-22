//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { useFocusableGroup } from '@fluentui/react-tabster';
import { composeRefs } from '@radix-ui/react-compose-refs';
import React, {
  type ComponentPropsWithRef,
  type ReactNode,
  forwardRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { ListItem, type ThemedClassName } from '@dxos/react-ui';
import { resizeAttributes, sizeStyle } from '@dxos/react-ui-dnd';
import { mx } from '@dxos/ui-theme';

import { type ItemDragState, StackItemContext, idle, useStack, useStackItem } from '../StackContext';
import { type StackItemData, type StackItemSize } from '../types';

import { StackItemContent, type StackItemContentProps } from './StackItemContent';
import { StackItemDragHandle, type StackItemDragHandleProps } from './StackItemDragHandle';
import {
  StackItemHeading,
  StackItemHeadingLabel,
  type StackItemHeadingLabelProps,
  type StackItemHeadingProps,
  StackItemHeadingStickyContent,
} from './StackItemHeading';
import { StackItemResizeHandle, type StackItemResizeHandleProps } from './StackItemResizeHandle';
import {
  StackItemSigil,
  type StackItemSigilAction,
  StackItemSigilButton,
  type StackItemSigilButtonProps,
  type StackItemSigilProps,
} from './StackItemSigil';

// NOTE: 48rem fills the screen on a MacbookPro with the sidebars closed.
export const DEFAULT_HORIZONTAL_SIZE = 48 satisfies StackItemSize;
export const DEFAULT_VERTICAL_SIZE = 'min-content' satisfies StackItemSize;
export const DEFAULT_EXTRINSIC_SIZE = DEFAULT_HORIZONTAL_SIZE satisfies StackItemSize;

//
// StackItemRoot
//

type StackItemRootProps = ThemedClassName<ComponentPropsWithRef<'div'>> & {
  item: Omit<StackItemData, 'type'>;
  order?: number;
  prevSiblingId?: string;
  nextSiblingId?: string;
  size?: StackItemSize;
  onSizeChange?: (nextSize: StackItemSize) => void;
  role?: 'article' | 'section';
  disableRearrange?: boolean;
  focusIndicatorVariant?: 'over-all' | 'group' | 'over-all-always' | 'group-always';
};

const StackItemRoot = forwardRef<HTMLDivElement, StackItemRootProps>(
  (
    {
      item,
      children,
      classNames,
      size: propsSize,
      onSizeChange,
      role,
      order,
      prevSiblingId,
      nextSiblingId,
      style,
      disableRearrange,
      focusIndicatorVariant = 'over-all',
      ...props
    },
    forwardedRef,
  ) => {
    const [itemElement, itemRef] = useState<HTMLDivElement | null>(null);
    const composedItemRef = composeRefs<HTMLDivElement>(itemRef, forwardedRef);
    const [selfDragHandleElement, selfDragHandleRef] = useState<HTMLDivElement | null>(null);
    const [closestEdge, setEdge] = useState<Edge | null>(null);
    const [sourceId, setSourceId] = useState<string | null>(null);
    const [dragState, setDragState] = useState<ItemDragState>(idle);
    const { orientation, rail, onRearrange, size: stackSize, stackId } = useStack();
    const [size = orientation === 'horizontal' ? DEFAULT_HORIZONTAL_SIZE : DEFAULT_VERTICAL_SIZE, setInternalSize] =
      useState(propsSize);

    const Root = role ?? 'div';

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

    // TODO(burdon): Factor out?
    useLayoutEffect(() => {
      if (!itemElement || !onRearrange || disableRearrange) {
        return;
      }

      return combine(
        draggable({
          element: itemElement,
          ...(selfDragHandleElement && { dragHandle: selfDragHandleElement }),
          getInitialData: () => ({ id: item.id, type }),
          onGenerateDragPreview: ({ nativeSetDragImage, source, location }) => {
            document.body.setAttribute('data-drag-preview', 'true');
            const offsetFn = preserveOffsetOnSource({ element: source.element, input: location.current.input });
            const rect = source.element.getBoundingClientRect();
            setCustomNativeDragPreview({
              nativeSetDragImage,
              getOffset: ({ container }) => {
                return offsetFn({ container });
              },
              render: ({ container }) => {
                container.style.width = rect.width + 'px';
                setDragState({ type: 'preview', container, item });
                return () => {};
              },
            });
          },
          onDragStart: () => {
            document.body.removeAttribute('data-drag-preview');
            itemElement?.closest('[data-drag-autoscroll]')?.setAttribute('data-drag-autoscroll', 'active');
            setDragState({ type: 'is-dragging', item });
          },
          onDrop: () => {
            itemElement?.closest('[data-drag-autoscroll]')?.setAttribute('data-drag-autoscroll', 'idle');
            setDragState(idle);
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
              setSourceId(source.data.id as string);
            }
          },
          onDrag: ({ self, source }) => {
            if (source.data.type === self.data.type) {
              setEdge(extractClosestEdge(self.data));
              setSourceId(source.data.id as string);
            }
          },
          onDragLeave: () => {
            setEdge(null);
            setSourceId(null);
          },
          onDrop: ({ self, source }) => {
            setEdge(null);
            setSourceId(null);
            if (source.data.type === self.data.type) {
              onRearrange(source.data as StackItemData, self.data as StackItemData, extractClosestEdge(self.data));
            }
          },
        }),
      );
    }, [orientation, item, onRearrange, selfDragHandleElement, itemElement]);

    const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited' });

    // Determine if the drop would result in any changes.
    const shouldShowDropIndicator = () => {
      if (!closestEdge || !sourceId) {
        return false;
      }

      // Don't show indicator when dragged item is over itself.
      if (sourceId === item.id) {
        return false;
      }

      // Don't show indicator when dragged item is over the trailing edge of its previous sibling.
      const isTrailingEdgeOfPrevSibling =
        prevSiblingId !== undefined &&
        sourceId === prevSiblingId &&
        ((orientation === 'horizontal' && closestEdge === 'left') ||
          (orientation === 'vertical' && closestEdge === 'top'));
      if (isTrailingEdgeOfPrevSibling) {
        return false;
      }

      // Don't show indicator when dragged item is over the leading edge of its next sibling
      const isLeadingEdgeOfNextSibling =
        nextSiblingId !== undefined &&
        sourceId === nextSiblingId &&
        ((orientation === 'horizontal' && closestEdge === 'right') ||
          (orientation === 'vertical' && closestEdge === 'bottom'));
      if (isLeadingEdgeOfNextSibling) {
        return false;
      }

      return true;
    };

    const stackItemContextValue = useMemo(
      () => ({ selfDragHandleRef, size, setSize, state: dragState, setState: setDragState, role }),
      [selfDragHandleRef, size, setSize, dragState, setDragState, role],
    );

    return (
      <StackItemContext.Provider value={stackItemContextValue}>
        <Root
          {...props}
          tabIndex={0}
          {...focusableGroupAttrs}
          className={mx(
            'group/stack-item grid relative',
            focusIndicatorVariant === 'over-all'
              ? 'dx-focus-ring-inset-over-all'
              : focusIndicatorVariant === 'over-all-always'
                ? 'dx-focus-ring-inset-over-all-always'
                : orientation === 'horizontal'
                  ? focusIndicatorVariant === 'group-always'
                    ? 'dx-focus-ring-group-x-always'
                    : 'dx-focus-ring-group-x'
                  : focusIndicatorVariant === 'group-always'
                    ? 'dx-focus-ring-group-y-always'
                    : 'dx-focus-ring-group-y',
            orientation === 'horizontal' ? 'grid-rows-subgrid' : 'grid-cols-subgrid',
            rail && (orientation === 'horizontal' ? 'row-span-2' : 'col-span-2'),
            role === 'section' && orientation !== 'horizontal' && 'border-be border-subduedSeparator',
            classNames,
          )}
          data-dx-stack-item={stackId}
          data-dx-item-id={item.id}
          {...resizeAttributes}
          style={{
            ...(stackSize !== 'split' && sizeStyle(size, orientation)),
            ...(Number.isFinite(order) && {
              [orientation === 'horizontal' ? 'gridColumn' : 'gridRow']: `${order}`,
            }),
            ...style,
          }}
          ref={composedItemRef}
        >
          {children}
          {shouldShowDropIndicator() && closestEdge && (
            <ListItem.DropIndicator lineInset={8} terminalInset={-8} edge={closestEdge} />
          )}
        </Root>
      </StackItemContext.Provider>
    );
  },
);

//
// StackItemDragPreview
//

type StackItemDragPreviewProps = {
  children: ({ item }: { item: any }) => ReactNode;
};

const StackItemDragPreview = ({ children }: StackItemDragPreviewProps) => {
  const { state } = useStackItem();
  return state?.type === 'preview' ? createPortal(children({ item: state.item }), state.container) : null;
};

//
// StackItem
//

export const StackItem = {
  Root: StackItemRoot,
  Content: StackItemContent,
  DragHandle: StackItemDragHandle,
  DragPreview: StackItemDragPreview,
  Heading: StackItemHeading,
  HeadingLabel: StackItemHeadingLabel,
  HeadingStickyContent: StackItemHeadingStickyContent,
  ResizeHandle: StackItemResizeHandle,
  Sigil: StackItemSigil,
  SigilButton: StackItemSigilButton,
};

export type {
  StackItemRootProps,
  StackItemContentProps,
  StackItemDragHandleProps,
  StackItemDragPreviewProps,
  StackItemHeadingProps,
  StackItemHeadingLabelProps,
  StackItemResizeHandleProps,
  StackItemSigilProps,
  StackItemSigilButtonProps,
  StackItemSigilAction,
};
