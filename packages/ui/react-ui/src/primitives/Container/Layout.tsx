//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, forwardRef, useMemo } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

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
          toolbar && [
            '[.dx-main-mobile-layout_&>.dx-toolbar]:pli-3 [&>.dx-toolbar]:relative',
            '[&>.dx-toolbar]:border-be [&>.dx-toolbar]:border-subduedSeparator',
          ],
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

// TODO(burdon): Reconcile with Container.Column.
// - Require container?
// - Custom vs. natural scroll container.
const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ classNames, children, role, scrollable }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        role={role ?? 'none'}
        className={mx('flex flex-col is-full', scrollable ? 'overflow-y-auto' : 'overflow-hidden', classNames)}
      >
        {children}
      </div>
    );
  },
);

//
// Layout
//

export const Layout = {
  Main,
  Container,
};

export type { MainProps as LayoutMainProps, ContainerProps as LayoutContainerProps };
