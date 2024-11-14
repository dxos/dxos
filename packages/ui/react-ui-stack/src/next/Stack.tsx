//
// Copyright 2024 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import React, {
  Children,
  type CSSProperties,
  type ComponentPropsWithRef,
  forwardRef,
  createContext,
  useContext,
} from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type Orientation = 'horizontal' | 'vertical';
export type Size = 'intrinsic' | 'contain';

export type StackProps = Omit<ThemedClassName<ComponentPropsWithRef<'div'>>, 'aria-orientation'> &
  Partial<StackContextValue> & { itemsCount?: number };

export type StackContextValue = {
  orientation: Orientation;
  separators: boolean;
  rail: boolean;
  size: Size;
};

export const StackContext = createContext<StackContextValue>({
  orientation: 'vertical',
  rail: true,
  size: 'intrinsic',
  separators: true,
});

export const useStack = () => useContext(StackContext);

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
            separators && 'bg-separator gap-px',
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
