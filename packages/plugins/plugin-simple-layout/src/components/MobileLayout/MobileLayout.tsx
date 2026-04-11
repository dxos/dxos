//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, forwardRef, useEffect, useLayoutEffect, useState } from 'react';

import { addEventListener, combine } from '@dxos/async';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useDebugLog } from '../DebugOverlay';

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
  ({ classNames, children, transition = 500, onKeyboardOpenChange, ...props }, forwardedRef) => {
    const { open: keyboardOpen } = useIOSKeyboard();
    useLockBodyScroll(keyboardOpen);
    useAutoScroll();

    // Fire synchronously after DOM mutation (before paint) so SimpleLayout's Splitter mode
    // change is batched into the same paint as the keyboard open state change, preventing
    // intermediate render frames from showing an un-adjusted layout.
    useLayoutEffect(() => onKeyboardOpenChange?.(keyboardOpen), [keyboardOpen, onKeyboardOpenChange]);

    return (
      <MobileLayoutProvider keyboardOpen={keyboardOpen}>
        <div
          {...props}
          role='none'
          style={{
            height: 'calc(100vh - var(--kb-height, 0px))',
            transition: `height ${keyboardOpen ? 0 : transition}ms ease-out`,
            // transition: `height ${animationDuration}ms ease-out`,
          }}
          className={mx('fixed top-0 left-0 right-0 grid overflow-hidden', classNames)}
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
        className={mx(classNames)}
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
 * Prevents iOS (WKWebView) from shifting the layout when the keyboard appears.
 *
 * Scroll events and window.scrollY stay at 0 in this WKWebView setup — the shift is
 * caused by the browser's scroll-into-view for the focused input. We keep a window
 * scroll reset as belt-and-suspenders, and also monitor container scroll events.
 */
const useAutoScroll = () => {
  // TODO(burdon): Remove debug logging.
  const { dbg } = useDebugLog('useAutoScroll');

  useEffect(() => {
    const resetScroll = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    const detectContainerScroll = (event: Event) => {
      const el = event.target as HTMLElement;
      if (el === document.documentElement || el === document.body) {
        return;
      }

      dbg(`scroll: ${el.tagName}.${Array.from(el.classList).slice(0, 2).join('.')} top=${el.scrollTop.toFixed(0)}`);
    };

    return combine(
      addEventListener(window, 'scroll', resetScroll),
      window.visualViewport ? addEventListener(window.visualViewport, 'scroll' as any, resetScroll) : () => {},

      // TODO(burdon): Remove debug logging.
      addEventListener(document, 'scroll', detectContainerScroll as EventListener, { capture: true } as any),

      // Prevent focus-triggered scroll-into-view on inputs.
      (() => {
        let focusingWithPreventScroll = false;
        return addEventListener(
          document,
          'focus',
          (event: FocusEvent) => {
            if (focusingWithPreventScroll) {
              return;
            }

            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
              focusingWithPreventScroll = true;
              target.focus({ preventScroll: true });
              focusingWithPreventScroll = false;
            }
          },
          { capture: true },
        );
      })(),
    );
  }, [dbg]);
};

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

    const isScrollable = (el: HTMLElement | null, axis: 'x' | 'y'): boolean => {
      while (el && el !== document.body) {
        const style = getComputedStyle(el);
        if (axis === 'y') {
          const overflow = style.overflowY;
          if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) {
            return true;
          }
        } else {
          const overflow = style.overflowX;
          if ((overflow === 'auto' || overflow === 'scroll') && el.scrollWidth > el.clientWidth) {
            return true;
          }
        }

        el = el.parentElement;
      }

      return false;
    };

    let touchStartX = 0;
    let touchStartY = 0;

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
          if (!isScrollable(event.target as HTMLElement, dx > dy ? 'x' : 'y')) {
            event.preventDefault();
          }
        },
        { passive: false },
      ),
    );
  }, [enabled]);
};

//
// Hooks
//

type IOSKeyboard = {
  open: boolean;
  height: number;
  /** Native keyboard animation duration in ms, from the iOS keyboard event. */
  duration: number | undefined;
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
 * - Keyboard: 318; 413 (incl. Input Accessory View)
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
  const { dbg } = useDebugLog('useIOSKeyboard');

  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(0);
  const [duration, setDuration] = useState<number | undefined>(undefined);

  // Detect keyboard state.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    // Handler for VisualViewport resize (fallback for non-iOS).
    const initialHeight = viewport.height ?? window.innerHeight;

    const updateState = (keyboardHeight: number, keyboardOpen: boolean, animationDuration?: number) => {
      setOpen(keyboardOpen);
      setHeight(keyboardHeight);
      setDuration(animationDuration);

      const vvh = initialHeight - keyboardHeight;
      document.documentElement.style.setProperty('--vvh', `${vvh}px`);
      document.documentElement.style.setProperty('--kb-height', `${keyboardHeight}px`);
      document.documentElement.style.setProperty('--kb-open', keyboardOpen ? '1' : '0');
      log.info('viewport size', { initialHeight, vvh, keyboardHeight, keyboardOpen, animationDuration });
    };

    let rafId: number | undefined;

    return combine(
      // Handler for native iOS keyboard events (from KeyboardObserver.swift).
      addEventListener(
        window,
        'keyboard' as any,
        (event: CustomEvent<{ type: 'show' | 'hide'; height: number; duration: number }>) => {
          const { type, height, duration } = event.detail;
          // iOS KeyboardObserver.swift sends duration in seconds (e.g., 0.25). Convert to ms.
          const durationMs = duration < 1 ? duration * 1000 : duration;

          // TODO(burdon): Remove debug logging.
          const vp = window.visualViewport;
          dbg(
            `kb:${type} h=${height} dur=${duration} scrollY=${window.scrollY} vpOffset=${vp?.offsetTop?.toFixed(0) ?? '?'}`,
          );
          log.info('keyboard event', { type, height, duration });

          updateState(height, type === 'show', durationMs);

          // RAF loop: monitor visualViewport.offsetTop and window.scrollY every frame.
          // TODO(burdon): Remove debug logging.
          const end = performance.now() + durationMs + 300;
          let prevOffsetTop = vp?.offsetTop ?? 0;
          let prevScrollY = window.scrollY;
          const monitorFrame = () => {
            const offsetTop = vp?.offsetTop ?? 0;
            const scrollY = window.scrollY;
            if (offsetTop !== prevOffsetTop || scrollY !== prevScrollY) {
              dbg(`Δ vpOffset=${offsetTop.toFixed(0)} scrollY=${scrollY.toFixed(0)}`);
              prevOffsetTop = offsetTop;
              prevScrollY = scrollY;
            }
            if (scrollY !== 0) {
              window.scrollTo(0, 0);
            }
            if (performance.now() < end) {
              rafId = requestAnimationFrame(monitorFrame);
            }
          };
          rafId = requestAnimationFrame(monitorFrame);
        },
      ),
      () => {
        if (rafId !== undefined) {
          cancelAnimationFrame(rafId);
        }
      },
    );
  }, [dbg]);

  return { open, height, duration };
};
