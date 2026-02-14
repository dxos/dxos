//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type HTMLAttributes, type PropsWithChildren, type Ref, forwardRef } from 'react';

import { type ColumnPadding } from '@dxos/ui-theme';
import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';

// TODO(burdon): Variant based on root.
// TODO(burdon): Replace Form, Container, Card spacing.
// TODO(burdon): Scrolling (reconcile with Mosaic Viewport).
// TODO(burdon): Reconcile AnchoredOverflow.

//
// Context
//

type ContainerContext = {
  variant?: ColumnPadding;
};

const [ContainerProvider, useContext] = createContext<ContainerContext>('Container');

//
// Root
//

type RootProps = Partial<ContainerContext> & {
  children: React.ReactNode;
};

const Root = ({ variant, children }: RootProps) => {
  return <ContainerProvider {...{ variant }}>{children}</ContainerProvider>;
};

//
// Column
//

const CONTAINER_COLUMN_NAME = 'Container.Column';

type ColumnProps = SlottableProps<
  PropsWithChildren<
    HTMLAttributes<HTMLDivElement> & {
      variant?: ColumnPadding;
    }
  >
>;

const Column = forwardRef(
  (
    { classNames, className, asChild, role = 'none', children, variant, ...props }: ColumnProps,
    ref: Ref<HTMLDivElement>,
  ) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    const context = useContext(CONTAINER_COLUMN_NAME);
    return (
      <Root
        {...props}
        className={tx('container.column', 'container__column', { variant: variant ?? context.variant }, [
          className,
          classNames,
        ])}
        role={role}
        ref={ref}
      >
        {children}
      </Root>
    );
  },
);

Column.displayName = CONTAINER_COLUMN_NAME;

//
// Container
//

export const Container = {
  Root,
  Column,
};

export type { RootProps as ContainerRootProps, ColumnProps as ContainerColumnProps };
