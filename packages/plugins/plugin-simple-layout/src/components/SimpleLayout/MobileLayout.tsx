//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, forwardRef, useEffect, useState } from 'react';

import { addEventListener, combine } from '@dxos/async';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// TODO(burdon): Move into @dxos/react-ui Main.

const MOBILE_LAYOUT_NAME = 'MobileLayout';

//
// Context
//

type MobileLayoutContextValue = {
  keyboardOpen: boolean;
};

const [MobileLayoutProvider, useMobileLayout] = createContext<MobileLayoutContextValue>(MOBILE_LAYOUT_NAME);

//
// MobileLayout
//

export type MobileLayoutProps = ThemedClassName<
  PropsWithChildren<{
    onKeyboardOpenChange?: (nextState: boolean) => void;
  }>
>;

/**
 * Mobile layout container that handles iOS keyboard detection and safe area insets.
 */
export const MobileLayout = forwardRef<HTMLDivElement, MobileLayoutProps>(
  ({ classNames, children, onKeyboardOpenChange, ...props }, forwardedRef) => {
    // TODO(burdon): ios-only.
    // Hook handles keyboard detection and sets CSS custom properties.
    const { open: keyboardOpen } = useIOSKeyboard();
    useEffect(() => {
      onKeyboardOpenChange?.(keyboardOpen);
    }, [keyboardOpen, onKeyboardOpenChange]);

    return (
      <MobileLayoutProvider keyboardOpen={keyboardOpen}>
        <div
          {...props}
          role='none'
          style={{
            transition: 'block-size 250ms ease-out',
            blockSize: 'calc(100vh - var(--kb-height, 0px))',
          }}
          className={mx('absolute top-0 left-0 right-0 flex flex-col bg-toolbarSurface', classNames)}
          ref={forwardedRef}
        >
          <div
            role='none'
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: `calc((1 - var(--kb-open, 0)) * env(safe-area-inset-bottom))`,
            }}
            className='relative bs-full flex flex-col overflow-hidden'
          >
            {children}
          </div>
        </div>
      </MobileLayoutProvider>
    );
  },
);

MobileLayout.displayName = MOBILE_LAYOUT_NAME;

export { useMobileLayout };

//
// useIOSKeyboard
//

type IOSKeyboard = {
  open: boolean;
  height: number;
};

/**
 * Mobile container that handles iOS keyboard layout adjustments.
 *
 * Uses two strategies for keyboard detection:
 * 1. Tauri iOS: Native keyboard plugin for reliable height/animation events.
 * 2. Web/PWA: visualViewport API as fallback.
 *
 * iPhone (portrait, points)
 * - Without predictive bar:  ~291 pt
 * - With predictive bar:     ~335 pt
 * - With accessory view:     ~380–420 pt
 *
 * Example:
 * - Viewport: 874 (entire screen)
 * - SafeArea: 96 (62+34)
 * - Main:     778
 * - Keyboard: 413 (incl. Input Accessory View)
 *
 * CSS Variables set on document.documentElement:
 * --vvh: Visual viewport height (use as container height).
 * --kb-height: Keyboard height in pixels.
 * --kb-open: 1 when keyboard is open, 0 when closed.
 *
 * NOTE: By default when an input is selected on iOS the Input Accessory View is shown above the keyboard.
 * This can be disabled by setting the `inputAccessoryView` property to `false`.
 *
 * On iOS (Tauri), listens for 'keyboard' CustomEvents dispatched by the native KeyboardObserver.swift.
 * Falls back to VisualViewport API on other platforms.
 */
const useIOSKeyboard = (): IOSKeyboard => {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(0);

  // Detect keybaord state.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    // Handler for VisualViewport resize (fallback for non-iOS).
    const initialHeight = viewport.height ?? window.innerHeight;

    const updateState = (keyboardHeight: number, open: boolean) => {
      setOpen(open);
      setHeight(keyboardHeight);

      const vvh = window.innerHeight - keyboardHeight;
      document.documentElement.style.setProperty('--vvh', `${vvh}px`);
      document.documentElement.style.setProperty('--kb-height', `${keyboardHeight}px`);
      document.documentElement.style.setProperty('--kb-open', open ? '1' : '0');
      log.info('[useIOSKeyboard] viewport size:', {
        vvh,
        keyboardHeight,
        open,
      });
    };

    return combine(
      // Prevent auto-scroll when input is focused.
      addEventListener(
        document,
        'focus',
        (ev: FocusEvent) => {
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
        },
        true,
      ),

      // TODO(burdon): This isn't triggered. Check swift plugin.
      // Handler for native iOS keyboard events (from KeyboardObserver.swift).
      addEventListener(
        window,
        'keyboard' as any,
        (event: CustomEvent<{ type: 'show' | 'hide'; height: number; duration: number }>) => {
          const { type, height } = event.detail;
          log.info('[useIOSKeyboard] Keyboard event:', { type, height });
          updateState(height, type === 'show');
        },
      ),

      // Lsten for VisualViewport as fallback.
      addEventListener(viewport, 'resize', () => {
        const heightDiff = initialHeight - viewport.height;
        const open = heightDiff > 100;
        log.info('[useIOSKeyboard] Resize event:', { open, initialHeight, heightDiff });
        updateState(open ? heightDiff : 0, open);
      }),
    );
  }, []);

  return { open, height };
};
