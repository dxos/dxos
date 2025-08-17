//
// Copyright 2025 DXOS.org
//

import React, {
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export interface ScrollController {
  viewport: HTMLDivElement | null;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export type ScrollContainerProps = ThemedClassName<
  PropsWithChildren<{
    pin?: boolean;
    fade?: boolean;
  }>
>;

/**
 * Scroll container that automatically scrolls to the bottom when new content is added.
 */
export const ScrollContainer = forwardRef<ScrollController, ScrollContainerProps>(
  ({ children, classNames, pin: _pin, fade }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
    const [pinned, setPinned] = useState(_pin);
    const [isOverflowing, setIsOverflowing] = useState(false);

    // Scroll controller imperative ref.
    useImperativeHandle(
      forwardedRef,
      () => ({
        viewport,
        // NOTE: Should be instant otherwise scrollHeight might be out of date.
        scrollToTop: (behavior: ScrollBehavior = 'smooth') => {
          invariant(viewport);
          viewport.scrollTo({ top: 0, behavior });
          setPinned(false);
        },
        scrollToBottom: (behavior: ScrollBehavior = 'instant') => {
          invariant(viewport);
          viewport.scrollTo({ top: viewport.scrollHeight, behavior });
        },
      }),
      [viewport],
    );

    const updateScrollState = useCallback(() => {
      if (viewport && _pin) {
        setPinned(viewport.scrollTop === viewport.scrollHeight - viewport.clientHeight);
        setIsOverflowing(viewport.scrollHeight > viewport.clientHeight);
      }
    }, [viewport, _pin]);

    useEffect(() => {
      if (pinned) {
        viewport?.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }
    }, [viewport, children, pinned]);

    useEffect(() => {
      if (!viewport) {
        return;
      }

      // Initial check.
      updateScrollState();

      // Listen for scroll events.
      viewport.addEventListener('scroll', updateScrollState);

      // TODO(burdon): addEventListener: 'wheel', 'touchmove', 'keydown', event.isTrusted.

      // Setup resize observer to detect content changes.
      const resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(viewport);

      return () => {
        viewport.removeEventListener('scroll', updateScrollState);
        resizeObserver.disconnect();
      };
    }, [viewport]);

    return (
      <div className='relative grid flex-1 min-bs-0 overflow-hidden'>
        {fade && (
          <div
            role='none'
            data-visible={isOverflowing && !pinned}
            className={mx(
              'opacity-0 duration-200 transition-opacity',
              'data-[visible="true"]:opacity-100 z-10 absolute block-start-0 inset-inline-0 bs-24',
              'bg-gradient-to-b from-[--surface-bg] to-transparent pointer-events-none',
            )}
          />
        )}
        <div className={mx('flex flex-col min-bs-0 overflow-y-auto scrollbar-thin', classNames)} ref={setViewport}>
          {children}
        </div>
      </div>
    );
  },
);
