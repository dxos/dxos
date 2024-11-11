//
// Copyright 2024 DXOS.org
//

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
  Partial<StackContextValue>;

export type StackContextValue = {
  orientation: Orientation;
  separators: boolean;
  rail: boolean;
  size: Size;
};

const StackContext = createContext<StackContextValue>({
  orientation: 'vertical',
  rail: true,
  size: 'intrinsic',
  separators: true,
});

export const useStack = () => useContext(StackContext);

const railGridHorizontal = 'grid-rows-[[rail-start]_var(--rail-size)_[content-start]_1fr_[content-end]]';

const railGridVertical = 'grid-cols-[[rail-start]_var(--rail-size)_[content-start]_1fr_[content-end]]';

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
      ...props
    },
    forwardedRef,
  ) => {
    const childrenCount = Children.count(children);

    const styles: CSSProperties = {
      [orientation === 'horizontal' ? 'gridTemplateColumns' : 'gridTemplateRows']:
        `repeat(${childrenCount}, min-content)`,
      ...style,
    };

    return (
      <StackContext.Provider value={{ orientation, rail, size, separators }}>
        <div
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
                ? 'overflow-x-auto min-bs-min bs-full max-bs-full'
                : 'overflow-y-auto min-is-min is-full max-is-full'),
            separators && 'bg-separator gap-px',
            classNames,
          )}
          aria-orientation={orientation}
          style={styles}
          {...props}
          ref={forwardedRef}
        >
          {children}
        </div>
      </StackContext.Provider>
    );
  },
);
