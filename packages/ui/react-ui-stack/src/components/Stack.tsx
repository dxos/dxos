//
// Copyright 2024 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import React, { Children, type CSSProperties, type ComponentPropsWithRef, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type StackContextValue, StackContext } from './StackContext';

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
      separators = true,
      size = 'intrinsic',
      itemsCount = Children.count(children),
      ...props
    },
    forwardedRef,
  ) => {
    const arrowNavigationGroup = useArrowNavigationGroup({ axis: orientation });

    const styles: CSSProperties = {
      [orientation === 'horizontal' ? 'gridTemplateColumns' : 'gridTemplateRows']: `repeat(${itemsCount}, min-content)`,
      ...style,
    };

    return (
      <StackContext.Provider value={{ orientation, rail, size, separators }}>
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
            separators && (orientation === 'horizontal' ? 'divide-separator divide-x' : 'divide-separator divide-y'),
            classNames,
          )}
          aria-orientation={orientation}
          style={styles}
          ref={forwardedRef}
        >
          {children}
        </div>
      </StackContext.Provider>
    );
  },
);

export { StackContext };
export type { StackContextValue };
