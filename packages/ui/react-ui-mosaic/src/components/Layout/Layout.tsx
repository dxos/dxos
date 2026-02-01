//
// Copyright 2026 DXOS.org
//

import React, { type HTMLAttributes, type PropsWithChildren, forwardRef, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

//
// Main
//

type MainProps = ThemedClassName<
  PropsWithChildren<{
    role?: string;
    toolbar?: boolean;
    statusbar?: boolean;
  }>
>;

// TODO(burdon): Borders.
const Main = forwardRef<HTMLDivElement, MainProps>(
  ({ classNames, children, role, toolbar, statusbar }, forwardedRef) => {
    const style = useMemo(
      () => ({
        gridTemplateRows: [toolbar && 'var(--toolbar-size)', '1fr', statusbar && 'var(--statusbar-size)']
          .filter(Boolean)
          .join(' '),
      }),
      [toolbar, statusbar],
    );

    return (
      <div
        ref={forwardedRef}
        role={role ?? 'none'}
        style={style}
        className={mx(
          'bs-full is-full grid grid-cols-[100%] overflow-hidden',
          toolbar && '[&>.dx-toolbar]:relative [&>.dx-toolbar]:border-be [&>.dx-toolbar]:border-subduedSeparator',
          classNames,
        )}
      >
        {children}
      </div>
    );
  },
);

//
// Container
//

type ContainerProps = ThemedClassName<
  PropsWithChildren<{
    role?: string;
    scrollable?: boolean;
  }>
>;

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ classNames, children, role, scrollable }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        role={role ?? 'none'}
        className={mx('grid bs-full', scrollable ? 'overflow-y-auto' : 'overflow-hidden', classNames)}
      >
        {children}
      </div>
    );
  },
);

//
// Flex
//

type FlexProps = ThemedClassName<
  HTMLAttributes<HTMLDivElement> & {
    column?: boolean;
    grow?: boolean;
  }
>;

const Flex = ({ children, classNames, role, column, grow }: FlexProps) => {
  return (
    <div
      role={role ?? 'none'}
      className={mx('flex', column && 'flex-col', grow && 'flex-1 overflow-hidden', classNames)}
    >
      {children}
    </div>
  );
};

//
// Layout
//

export const Layout = {
  Main,
  Container,
  Flex,
};

export type { MainProps as LayoutMainProps, ContainerProps as LayoutContainerProps, FlexProps as LayoutFlexProps };
