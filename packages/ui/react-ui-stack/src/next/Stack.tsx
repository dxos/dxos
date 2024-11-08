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
  rail: boolean;
  size: Size;
};

const StackContext = createContext<StackContextValue>({ orientation: 'vertical', rail: true, size: 'intrinsic' });

export const useStack = () => useContext(StackContext);

const railGridHorizontal = 'grid-rows-[[rail-start]_var(--rail-size)_[content-start]_1fr_[content-end]]';

const railGridVertical = 'grid-cols-[[rail-start]_var(--rail-size)_[content-start]_1fr_[content-end]]';

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({ children, classNames, style, orientation = 'vertical', rail = true, size = 'intrinsic', ...props }) => {
    const childrenCount = Children.count(children);

    const styles: CSSProperties = {
      [orientation === 'horizontal' ? 'gridTemplateColumns' : 'gridTemplateRows']:
        `repeat(${childrenCount}, min-content)`,
      ...style,
    };

    return (
      <StackContext.Provider value={{ orientation, rail, size }}>
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
            classNames,
          )}
          aria-orientation={orientation}
          style={styles}
          {...props}
        >
          {children}
        </div>
      </StackContext.Provider>
    );
  },
);
