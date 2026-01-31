//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

//
// Main
//

type MainProps = PropsWithChildren<{
  role?: string;
  toolbar?: boolean;
  statusbar?: boolean;
}>;

const Main = ({ children, role, toolbar, statusbar }: MainProps) => {
  const style = useMemo(
    () => ({
      gridTemplateRows: [
        ...(toolbar ? ['var(--toolbar-size)'] : []),
        '1fr',
        ...(statusbar ? ['var(--statusbar-size)'] : []),
      ].join(' '),
    }),
    [toolbar, statusbar],
  );

  return (
    <div role={role ?? 'none'} style={style} className={mx('bs-full grid grid-cols-[100%] density-fine')}>
      {children}
    </div>
  );
};

//
// Flex
// TODO(burdon): Reconcile with react-ui-components.
//

type FlexProps = ThemedClassName<
  PropsWithChildren<{
    role?: string;
    column?: boolean;
    grow?: boolean;
  }>
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
// Scrollbar
// TODO(burdon): Reconcile with mosaic viewport.
//

type ScrollbarProps = ThemedClassName<
  PropsWithChildren<{
    column?: boolean;
  }>
>;

const Scrollbar = ({ classNames, children, column }: ScrollbarProps) => {
  return (
    <div className={mx('__scrollbar __scrollbar-thin', column ? 'overflow-y-auto' : 'overflow-x-auto', classNames)}>
      {children}
    </div>
  );
};

//
// Layout
//

export const Layout = {
  Main,
  Flex,
  Scrollbar,
};

export type { MainProps, FlexProps, ScrollbarProps };
