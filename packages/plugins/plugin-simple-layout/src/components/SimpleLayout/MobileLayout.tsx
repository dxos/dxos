//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';

import { useIOSKeyboard } from '../../hooks';

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
      role='none'
      style={{
        transition: 'block-size 250ms ease-out',
        blockSize: 'calc(100vh - var(--kb-height, 0px))',
      }}
      className='fixed top-0 left-0 right-0 flex flex-col overflow-hidden bg-toolbarSurface'
      ref={forwardedRef}
    >
      <div
        role='none'
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
// Footer
//

const MAX_BLOCK_SIZE = 200;

type FooterProps = PropsWithChildren;

const Footer = forwardRef<HTMLDivElement, FooterProps>(({ children, ...props }, forwardedRef) => {
  return (
    <footer
      {...props}
      className={mx('shrink-0 overflow-hidden')}
      style={{
        // Smoothly collapse footer when keyboard opens.
        transition: 'max-block-size,opacity 300ms ease-out',
        maxBlockSize: `calc((1 - var(--kb-open, 0)) * ${MAX_BLOCK_SIZE}px)`,
        opacity: 'calc(1 - var(--kb-open, 0))',
      }}
      ref={forwardedRef}
    >
      {children}
    </footer>
  );
});

Footer.displayName = 'MobileLayout.Footer';

//
// Mobile
//

export const MobileLayout = {
  Root,
  Footer,
};

export type { RootProps, FooterProps };
