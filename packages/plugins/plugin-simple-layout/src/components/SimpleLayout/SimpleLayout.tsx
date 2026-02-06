//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect } from 'react';

import { type DrawerState, Input, Main as NaturalMain } from '@dxos/react-ui';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/ui-theme';

import { useIOSKeyboard, useSimpleLayoutState } from '../../hooks';
import { Dialog } from '../Dialog';
import { PopoverContent, PopoverRoot } from '../Popover';

import { Drawer } from './Drawer';
import { Main } from './Main';

export const SimpleLayout = () => {
  const { state, updateState } = useSimpleLayoutState();

  const handleDrawerStateChange = useCallback(
    (nextState: DrawerState) => {
      // Sync all drawer state changes to state.
      updateState((state) => ({ ...state, drawerState: nextState }));
    },
    [updateState],
  );

  return (
    <Mosaic.Root classNames='contents'>
      <MobileContainer>
        <NaturalMain.Root drawerState={state.drawerState ?? 'closed'} onDrawerStateChange={handleDrawerStateChange}>
          <PopoverRoot>
            <Main />
            <Drawer />
            <Dialog />
            <PopoverContent />
          </PopoverRoot>
        </NaturalMain.Root>
      </MobileContainer>
    </Mosaic.Root>
  );
};

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
const MobileContainer = ({ children }: PropsWithChildren) => {
  // Hook handles keyboard detection and sets CSS custom properties.
  useIOSKeyboard();

  // Prevent auto-scroll when input is focused.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const preventAutoScroll = (ev: FocusEvent) => {
      const target = ev.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Prevent default focus behavior.
        ev.preventDefault();

        // Manually focus without scroll.
        target.focus({ preventScroll: true });

        // Lock current scroll position.
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
        });
      }
    };

    document.addEventListener('focus', preventAutoScroll, true);
    return () => {
      document.removeEventListener('focus', preventAutoScroll, true);
    };
  }, []);

  return (
    <div
      className={mx(
        // Fixed positioning to fill viewport - hook handles body locking.
        'fixed top-0 left-0 right-0 overflow-hidden',
        'flex flex-col',
      )}
      style={{
        height: 'calc(100vh - var(--kb-height, 0px))',
        transition: 'height 300ms ease-out',
      }}
    >
      <header
        className='shrink-0 overflow-hidden'
        style={{
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className='p-1 border'>HEADER</div>
      </header>

      <main className='flex flex-col bs-full min-bs-0 overflow-y-auto border'>
        <div className='flex flex-col'>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className='p-1'>
              <Input.Root>
                <Input.TextInput value={i} />
              </Input.Root>
            </div>
          ))}
        </div>
      </main>

      {/* Footer: shrinks out of view when keyboard is open */}
      <footer
        className='shrink-0 overflow-hidden'
        style={{
          // Smoothly collapse footer when keyboard opens.
          transition: 'max-block-size opacity 300ms ease-out',
          maxBlockSize: 'calc((1 - var(--kb-open, 0)) * 200px)',
          paddingBottom: 'calc((1 - var(--kb-open, 0)) * env(safe-area-inset-bottom))',
          opacity: 'calc(1 - var(--kb-open, 0))',
        }}
      >
        <div className='p-1 border'>FOOTER</div>
      </footer>
    </div>
  );
};
