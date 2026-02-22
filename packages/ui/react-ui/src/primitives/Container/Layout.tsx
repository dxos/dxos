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

// TODO(burdon): Rename and move into Container.
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
          'block-full inline-full grid grid-cols-[100%] overflow-hidden',
          toolbar && [
            '[.dx-main-mobile-layout_&>.dx-toolbar]:px-3 [&>.dx-toolbar]:relative',
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
// Layout
//

export const Layout = {
  Main,
};

export type { MainProps as LayoutMainProps };
