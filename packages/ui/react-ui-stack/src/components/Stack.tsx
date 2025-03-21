//
// Copyright 2025 DXOS.org
//

// import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { composeRefs } from '@radix-ui/react-compose-refs';
import React, { Children, type CSSProperties, type ComponentPropsWithRef, forwardRef, useState, useMemo } from 'react';

import { type ThemedClassName, ListItem } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type StackContextValue, StackContext } from './StackContext';
import { useStackDropForElements } from '../hooks';

export type Orientation = 'horizontal' | 'vertical';
export type Size = 'intrinsic' | 'contain' | 'contain-fit-content';

export type StackProps = Omit<ThemedClassName<ComponentPropsWithRef<'div'>>, 'aria-orientation'> &
  Partial<StackContextValue> & { itemsCount?: number };

export const railGridHorizontal = 'grid-rows-[[rail-start]_var(--rail-size)_[content-start]_1fr_[content-end]]';
export const railGridVertical = 'grid-cols-[[rail-start]_var(--rail-size)_[content-start]_1fr_[content-end]]';

// TODO(ZaymonFC): Magic 2px to stop overflow (tabster dummies... ask @thure).
export const railGridHorizontalContainFitContent =
  'grid-rows-[[rail-start]_var(--rail-size)_[content-start]_fit-content(calc(100%-var(--rail-size)*2+2px))_[content-end]]';
export const railGridVerticalContainFitContent =
  'grid-cols-[[rail-start]_var(--rail-size)_[content-start]_fit-content(calc(100%-var(--rail-size)*2+2px))_[content-end]]';

export const autoScrollRootAttributes = { 'data-drag-autoscroll': 'idle' };

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
    const arrowNavigationAttrs = {}; // useArrowNavigationGroup({ axis: orientation });

    const styles: CSSProperties = {
      [orientation === 'horizontal' ? 'gridTemplateColumns' : 'gridTemplateRows']:
        `repeat(${itemsCount}, min-content) [tabster-dummies] 0`,
      ...style,
    };

    const selfDroppable = !!(itemsCount < 1 && onRearrange && props.id);

    const { dropping } = useStackDropForElements({
      id: props.id,
      element: stackElement,
      selfDroppable,
      orientation,
      onRearrange,
    });

    const gridClasses = useMemo(() => {
      if (!rail) {
        return orientation === 'horizontal' ? 'grid-rows-1 pli-1' : 'grid-cols-1 plb-1';
      }
      if (orientation === 'horizontal') {
        return size === 'contain-fit-content' ? railGridHorizontalContainFitContent : railGridHorizontal;
      } else {
        return size === 'contain-fit-content' ? railGridVerticalContainFitContent : railGridVertical;
      }
    }, [rail, orientation, size]);

    return (
      <StackContext.Provider value={{ orientation, rail, size, onRearrange }}>
        <div
          {...props}
          {...arrowNavigationAttrs}
          className={mx(
            'grid relative',
            gridClasses,
            (size === 'contain' || size === 'contain-fit-content') &&
              (orientation === 'horizontal'
                ? 'overflow-x-auto min-bs-0 bs-full max-bs-full'
                : 'overflow-y-auto min-is-0 is-full max-is-full'),
            classNames,
          )}
          data-rail={rail}
          aria-orientation={orientation}
          style={styles}
          ref={composedItemRef}
        >
          {children}
          {selfDroppable && dropping && (
            <ListItem.DropIndicator
              lineInset={8}
              terminalInset={-8}
              gap={-8}
              edge={orientation === 'horizontal' ? 'left' : 'top'}
            />
          )}
        </div>
      </StackContext.Provider>
    );
  },
);

export { StackContext };
export type { StackContextValue };
