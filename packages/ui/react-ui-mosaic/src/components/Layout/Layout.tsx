//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

//
// Root
//

type RootProps = PropsWithChildren<{
  role?: string;
  toolbar?: boolean;
  statusbar?: boolean;
}>;

const Root = ({ children, role, toolbar, statusbar }: RootProps) => {
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
    scrollable?: boolean;
  }>
>;

const Flex = ({ children, classNames, role, column, scrollable }: FlexProps) => {
  return (
    <div
      role={role ?? 'none'}
      className={mx('flex', column && 'flex-col', scrollable ? 'overflow-y-auto' : 'overflow-hidden', classNames)}
    >
      {children}
    </div>
  );
};

//
// Layout
//

export const Layout = {
  Root,
  Flex,
};

export type { RootProps, FlexProps };
