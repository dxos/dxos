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

/**
 * Mobile container that handles iOS keyboard layout adjustments.
 *
 * Uses two strategies for keyboard detection:
 * 1. Tauri iOS: Native keyboard plugin for reliable height/animation events.
 * 2. Web/PWA: visualViewport API as fallback.
 *
 * CSS Variables set on document.documentElement:
 * - --vvh: Visual viewport height (use as container height).
 * - --kb-height: Keyboard height in pixels.
 * - --kb-open: 1 when keyboard is open, 0 when closed.
 *
 * NOTE: By default when an input is selected on iOS the Input Accessory View is shown above the keyboard.
 * This can be disabled by setting the `inputAccessoryView` property to `false`.
 */
const Root = forwardRef<HTMLDivElement, RootProps>(({ children, ...props }, forwardedRef) => {
  // Hook handles keyboard detection and sets CSS custom properties.
  useIOSKeyboard();

  return (
    <div
      {...props}
      className={mx(
        // Fixed positioning to fill viewport - hook handles body locking.
        'fixed top-0 left-0 right-0 overflow-hidden',
        'flex flex-col',
      )}
      style={{
        height: 'calc(100vh - var(--kb-height, 0px))',
        transition: 'height 300ms ease-out',
      }}
      ref={forwardedRef}
    >
      {children}
    </div>
  );
});

//
// Header
//

type HeaderPorps = PropsWithChildren;

const Header = forwardRef<HTMLDivElement, HeaderPorps>(({ children, ...props }, forwardedRef) => {
  return (
    <header
      {...props}
      className={mx('shrink-0 overflow-hidden')}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
      ref={forwardedRef}
    >
      {children}
    </header>
  );
});

//
// Footer
//

type FooterProps = PropsWithChildren;

const Footer = forwardRef<HTMLDivElement, FooterProps>(({ children, ...props }, forwardedRef) => {
  return (
    <footer
      {...props}
      className={mx('shrink-0 overflow-hidden')}
      style={{
        // Smoothly collapse footer when keyboard opens.
        transition: 'max-block-size opacity 300ms ease-out',
        maxBlockSize: 'calc((1 - var(--kb-open, 0)) * 200px)',
        paddingBottom: 'calc((1 - var(--kb-open, 0)) * env(safe-area-inset-bottom))',
        opacity: 'calc(1 - var(--kb-open, 0))',
      }}
      ref={forwardedRef}
    >
      {children}
    </footer>
  );
});

//
// Main
//

type MainProps = PropsWithChildren;

const Main = ({ children }: MainProps) => {
  return <main className='flex flex-col bs-full min-bs-0 overflow-y-auto border'>{children}</main>;
};

// TODO(burdon): Drawer.

export const MobileLayout = {
  Root,
  Header,
  Footer,
  Main,
};

export type { RootProps, HeaderPorps, FooterProps, MainProps };
