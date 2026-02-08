//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useIOSKeyboard } from '../../hooks';

// TODO(burdon): Integrate into react-ui Main.

//
// Root
//

type RootProps = PropsWithChildren;

const Root = forwardRef<HTMLDivElement, RootProps>(({ children, ...props }, forwardedRef) => {
  // TODO(burdon): ios-only.
  // Hook handles keyboard detection and sets CSS custom properties.
  useIOSKeyboard();

  return (
    <div
      {...props}
      style={{
        transition: 'block-size 250ms ease-out',
        blockSize: 'calc(100vh - var(--kb-height, 0px))',
      }}
      className={mx(
        // Fixed positioning to fill viewport (hook handles body locking).
        'fixed top-0 left-0 right-0 flex flex-col overflow-hidden',
      )}
      ref={forwardedRef}
    >
      <div
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: `calc((1 - var(--kb-open, 0)) * env(safe-area-inset-bottom))`,
        }}
        className='bs-full overflow-hidden'
      >
        {children}
      </div>
    </div>
  );
});

Root.displayName = 'MobileLayout.Root';

//
// Main
//

type MainProps = ThemedClassName<PropsWithChildren>;

const Main = ({ children, classNames }: MainProps) => {
  return <main className={mx('flex flex-col bs-full min-bs-0 overflow-y-auto', classNames)}>{children}</main>;
};

Main.displayName = 'MobileLayout.Main';

//
// Mobile
//

export const MobileLayout = {
  Root,
  Main,
};

export type { RootProps, MainProps };
