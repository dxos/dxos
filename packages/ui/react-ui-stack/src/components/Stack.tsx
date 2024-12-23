//
// Copyright 2024 DXOS.org
//
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { composeRefs } from '@radix-ui/react-compose-refs';
import React, {
  Children,
  type CSSProperties,
  type ComponentPropsWithRef,
  forwardRef,
  useLayoutEffect,
  useState,
} from 'react';

import { type ThemedClassName, ListItem } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type StackContextValue, StackContext, type StackItemData } from './StackContext';

export type Orientation = 'horizontal' | 'vertical';
export type Size = 'intrinsic' | 'contain';

export type StackProps = Omit<ThemedClassName<ComponentPropsWithRef<'div'>>, 'aria-orientation'> &
  Partial<StackContextValue> & { itemsCount?: number };

export const railGridHorizontal = 'grid-rows-[[rail-start]_var(--rail-size)_[content-start]_1fr_[content-end]]';

export const railGridVertical = 'grid-cols-[[rail-start]_var(--rail-size)_[content-start]_1fr_[content-end]]';

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      children,
      classNames,
      style,
      orientation = 'vertical',
      rail = true,
      size = 'intrinsic',
      onRearrange,
      itemsCount = Children.count(children),
      ...props
    },
    forwardedRef,
  ) => {
    const [stackElement, stackRef] = useState<HTMLDivElement | null>(null);
    const composedItemRef = composeRefs<HTMLDivElement>(stackRef, forwardedRef);
    const [dropping, setDropping] = useState(false);

    const arrowNavigationGroup = useArrowNavigationGroup({ axis: orientation });

    const styles: CSSProperties = {
      [orientation === 'horizontal' ? 'gridTemplateColumns' : 'gridTemplateRows']: `repeat(${itemsCount}, min-content)`,
      ...style,
    };

    const selfDroppable = !!(itemsCount < 1 && onRearrange && props.id);

    useLayoutEffect(() => {
      if (!stackElement || !selfDroppable) {
        return;
      }
      const acceptSourceType = orientation === 'horizontal' ? 'column' : 'card';
      return dropTargetForElements({
        element: stackElement,
        getData: ({ input, element }) => {
          return attachClosestEdge(
            { id: props.id, type: orientation === 'horizontal' ? 'card' : 'column' },
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
        onDragLeave: () => setDropping(false),
        onDrop: ({ self, source }) => {
          setDropping(false);
          if (source.data.type === acceptSourceType && selfDroppable) {
            onRearrange(source.data as StackItemData, self.data as StackItemData, extractClosestEdge(self.data));
          }
        },
      });
    }, [stackElement, selfDroppable]);

    return (
      <StackContext.Provider value={{ orientation, rail, size, onRearrange }}>
        <div
          {...props}
          {...arrowNavigationGroup}
          className={mx(
            'grid relative',
            rail
              ? orientation === 'horizontal'
                ? railGridHorizontal
                : railGridVertical
              : orientation === 'horizontal'
                ? 'grid-rows-1'
                : 'grid-cols-1',
            size === 'contain' &&
              (orientation === 'horizontal'
                ? 'overflow-x-auto min-bs-0 bs-full max-bs-full'
                : 'overflow-y-auto min-is-0 is-full max-is-full'),
            classNames,
          )}
          aria-orientation={orientation}
          style={styles}
          ref={composedItemRef}
        >
          {children}
          {selfDroppable && dropping && <ListItem.DropIndicator edge={orientation === 'horizontal' ? 'left' : 'top'} />}
        </div>
      </StackContext.Provider>
    );
  },
);

export { StackContext };
export type { StackContextValue };
