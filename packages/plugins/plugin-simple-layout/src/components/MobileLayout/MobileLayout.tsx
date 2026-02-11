//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, forwardRef, useEffect, useState } from 'react';

import { addEventListener, combine } from '@dxos/async';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// TODO(burdon): Move into @dxos/react-ui?

const MOBILE_LAYOUT_NAME = 'MobileLayout';
const MOBILE_LAYOUT_ROOT_NAME = 'MobileLayout.Root';
const MOBILE_LAYOUT_PANEL_NAME = 'MobileLayout.Panel';

//
// Context
//

type MobileLayoutContextValue = {
  keyboardOpen: boolean;
};

const [MobileLayoutProvider, useMobileLayout] = createContext<MobileLayoutContextValue>(MOBILE_LAYOUT_NAME);

//
// Root
//

type MobileLayoutRootProps = ThemedClassName<
  PropsWithChildren<{
    transition?: number;
    onKeyboardOpenChange?: (nextState: boolean) => void;
  }>
>;

/**
 * Mobile layout root container that handles iOS keyboard detection.
 */
// TODO(burdon): Should this be ios-only?
const MobileLayoutRoot = forwardRef<HTMLDivElement, MobileLayoutRootProps>(
  ({ classNames, children, transition = 250, onKeyboardOpenChange, ...props }, forwardedRef) => {
    const { open: keyboardOpen } = useIOSKeyboard();
    useEffect(() => onKeyboardOpenChange?.(keyboardOpen), [onKeyboardOpenChange, keyboardOpen]);
    useLockBodyScroll(keyboardOpen);

    return (
      <MobileLayoutProvider keyboardOpen={keyboardOpen}>
        <div
          {...props}
          role='none'
          style={{
            transition: `block-size ${transition}ms ease-out`,
            blockSize: 'calc(100vh - var(--kb-height, 0px))',
          }}
          className={mx('absolute top-0 left-0 right-0 flex flex-col', classNames)}
          ref={forwardedRef}
        >
          {children}
        </div>
      </MobileLayoutProvider>
    );
  },
);

MobileLayoutRoot.displayName = MOBILE_LAYOUT_ROOT_NAME;

//
// Panel
//

type MobileLayoutPanelProps = ThemedClassName<
  PropsWithChildren<{
    safe?: {
      top: boolean;
      bottom: boolean;
    };
  }>
>;

/**
 * Mobile layout panel that applies safe area insets.
 */
const MobileLayoutPanel = forwardRef<HTMLDivElement, MobileLayoutPanelProps>(
  ({ classNames, children, safe, ...props }, forwardedRef) => {
    return (
      <div
        {...props}
        role='none'
        style={{
          paddingTop: safe?.top ? 'env(safe-area-inset-top)' : undefined,
          paddingBottom: safe?.bottom ? `calc((1 - var(--kb-open, 0)) * env(safe-area-inset-bottom))` : undefined,
        }}
        className={mx('relative bs-full flex flex-col overflow-hidden', classNames)}
        ref={forwardedRef}
      >
        {children}
      </div>
    );
  },
);

MobileLayoutPanel.displayName = MOBILE_LAYOUT_PANEL_NAME;

//
// Exports
//

export const MobileLayout = {
  Root: MobileLayoutRoot,
  Panel: MobileLayoutPanel,
};

export { useMobileLayout };

export type { MobileLayoutRootProps, MobileLayoutPanelProps };

/**
 * Prevent iOS Safari viewport scroll when enabled.
 * Setting overflow:hidden doesn't work on iOS, so we must preventDefault on touchmove events.
 * Only allows scrolling if the target is within a scrollable container.
 */
const useLockBodyScroll = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let touchStartX = 0;
    let touchStartY = 0;

    const isScrollableInDirection = (el: HTMLElement | null, axis: 'x' | 'y'): boolean => {
      while (el && el !== document.body) {
        const style = getComputedStyle(el);
        if (axis === 'y') {
          const overflowY = style.overflowY;
          if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
            return true;
          }
        } else {
          const overflowX = style.overflowX;
          if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth) {
            return true;
          }
        }
        el = el.parentElement;
      }

      return false;
    };

    return combine(
      // Record initial touch position.
      addEventListener(
        document,
        'touchstart',
        (event: TouchEvent) => {
          const touch = event.touches[0];
          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
        },
        { passive: true },
      ),

      // Prevent scrolling the viewport.
      addEventListener(
        document,
        'touchmove',
        (event: TouchEvent) => {
          const touch = event.touches[0];
          const dx = Math.abs(touch.clientX - touchStartX);
          const dy = Math.abs(touch.clientY - touchStartY);
          const axis = dx > dy ? 'x' : 'y';

          const target = event.target as HTMLElement;
          if (!isScrollableInDirection(target, axis)) {
            event.preventDefault();
          }
        },
        { passive: false },
      ),

      // Prevent auto-scroll when input is focused.
      addEventListener(document, 'focus', (ev: FocusEvent) => {
        const target = ev.target as HTMLElement;

        // TODO(burdon): Check content editable.
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'DIV') {
          // Prevent default focus behavior.
          ev.preventDefault();

          // Manually focus without scroll.
          target.focus({ preventScroll: true });

          // Lock current scroll position.
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          requestAnimationFrame(() => {
            window.scrollTo(scrollX, scrollY);
          });
        }
      }),
    );
  }, [enabled]);
};

//
// Hooks
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
 * - Keyboard: 318, 413 (incl. Input Accessory View)
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

    const updateState = (keyboardHeight: number, keyboardOpen: boolean) => {
      setOpen(keyboardOpen);
      setHeight(keyboardHeight);

      const vvh = initialHeight - keyboardHeight;
      document.documentElement.style.setProperty('--vvh', `${vvh}px`);
      document.documentElement.style.setProperty('--kb-height', `${keyboardHeight}px`);
      document.documentElement.style.setProperty('--kb-open', keyboardOpen ? '1' : '0');
      log.info('viewport size', { initialHeight, vvh, keyboardHeight, keyboardOpen });
    };

    return combine(
      // Handler for native iOS keyboard events (from KeyboardObserver.swift).
      addEventListener(
        window,
        'keyboard' as any,
        (event: CustomEvent<{ type: 'show' | 'hide'; height: number; duration: number }>) => {
          const { type, height } = event.detail;
          log.info('keyboard event', { type, height });
          updateState(height, type === 'show');
        },
      ),
    );
  }, []);

  return { open, height };
};
