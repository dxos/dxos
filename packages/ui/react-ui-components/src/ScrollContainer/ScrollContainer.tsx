//
// Copyright 2025 DXOS.org
//

import React, {
  Children,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export interface ScrollController {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export type ScrollContainerProps = ThemedClassName<
  PropsWithChildren<{
    fade?: boolean;
  }>
>;

/**
 * Scroll container that automatically scrolls to the bottom when new content is added.
 */
export const ScrollContainer = forwardRef<ScrollController, ScrollContainerProps>(
  ({ children, classNames, fade }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [scrolledAtTop, setScrolledAtTop] = useState(false);

    // Scroll controller imperative ref.
    useImperativeHandle(
      forwardedRef,
      () => ({
        // NOTE: Should be instant otherwise scrollHeight might be out of date.
        scrollToBottom: (behavior: ScrollBehavior = 'instant') => {
          invariant(viewport);
          viewport.scrollTo({ top: 0, behavior });
        },
      }),
      [viewport],
    );

    const updateScrollState = useCallback(() => {
      if (viewport) {
        // Check if content is overflowing.
        setIsOverflowing(viewport.scrollHeight > viewport.clientHeight);
        // In flex-col-reverse, scrollTop > 0 means we're not at the visual top, also the value will be negative.
        setScrolledAtTop(-viewport.scrollTop + 16 >= viewport.scrollHeight - viewport.clientHeight);
      }
    }, [viewport]);

    // Scroll controller imperative ref.
    const reversedChildren = useMemo(() => [...Children.toArray(children)].reverse(), [children]);
    useEffect(() => {
      updateScrollState();
    }, [Children.count(children), viewport]);

    useEffect(() => {
      if (!viewport || !fade) {
        return;
      }

      // Initial check.
      updateScrollState();

      // Listen for scroll events.
      viewport.addEventListener('scroll', updateScrollState);

      // Setup resize observer to detect content changes.
      const resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(viewport);

      return () => {
        viewport.removeEventListener('scroll', updateScrollState);
        resizeObserver.disconnect();
      };
    }, [viewport, fade]);

    return (
      <div className='relative flex-1 min-bs-0 grid overflow-hidden'>
        {fade && (
          <div
            role='none'
            data-visible={isOverflowing && !scrolledAtTop}
            className={mx(
              'opacity-0 duration-200 transition-opacity',
              'data-[visible="true"]:opacity-100 z-10 absolute block-start-0 inset-inline-0 bs-24',
              'bg-gradient-to-b from-[--surface-bg] to-transparent pointer-events-none',
            )}
          />
        )}
        <div
          className={mx('flex flex-col-reverse min-bs-0 overflow-y-auto scrollbar-thin', classNames)}
          ref={setViewport}
        >
          {reversedChildren}
        </div>
      </div>
    );
  },
);
