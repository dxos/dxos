//
// Copyright 2025 DXOS.org
//

import React, {
  type PropsWithChildren,
  forwardRef,
  useImperativeHandle,
  useState,
  Children,
  useEffect,
  useCallback,
} from 'react';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export interface ScrollController {
  scrollToBottom: () => void;
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
    const [scrolledFromTop, setScrolledFromTop] = useState(false);

    // Scroll controller imperative ref
    useImperativeHandle(
      forwardedRef,
      () => ({
        scrollToBottom: () => {
          invariant(viewport);
          // NOTE: Should be instant otherwise scrollHeight might be out of date.
          viewport.scrollTo({ top: 0, behavior: 'instant' });
        },
      }),
      [viewport],
    );

    const updateScrollState = useCallback(() => {
      if (viewport) {
        // Check if content is overflowing
        setIsOverflowing(viewport.scrollHeight > viewport.clientHeight);
        // In flex-col-reverse, scrollTop > 0 means we're not at the visual top, also the value will be negative.
        setScrolledFromTop(-viewport.scrollTop + 16 >= viewport.scrollHeight - viewport.clientHeight);
      }
    }, [viewport]);

    useEffect(() => {
      if (!viewport || !fade) {
        return;
      }

      // Initial check
      updateScrollState();

      // Listen for scroll events
      viewport.addEventListener('scroll', updateScrollState);

      // Setup resize observer to detect content changes
      const resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(viewport);

      return () => {
        viewport.removeEventListener('scroll', updateScrollState);
        resizeObserver.disconnect();
      };
    }, [viewport, fade]);

    useEffect(() => {
      updateScrollState();
    }, [Children.count(children), viewport]);

    return (
      <div className='relative flex-1 min-bs-0 grid'>
        {fade && (
          <div
            role='none'
            data-visible={isOverflowing && !scrolledFromTop}
            className='opacity-0 duration-200 transition-opacity data-[visible="true"]:opacity-100 z-10 absolute block-start-0 inset-inline-0 bs-24 pointer-events-none bg-gradient-to-b from-[--surface-bg] to-transparent pointer-events-none'
          />
        )}
        <div
          className={mx('flex flex-col-reverse min-bs-0 overflow-y-auto scrollbar-thin', classNames)}
          ref={setViewport}
        >
          {[...Children.toArray(children)].reverse()}
        </div>
      </div>
    );
  },
);
