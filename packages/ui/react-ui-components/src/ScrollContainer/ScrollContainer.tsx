//
// Copyright 2025 DXOS.org
//

import React, {
  type PropsWithChildren,
  type UIEventHandler,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export interface ScrollController {
  scrollToBottom: () => void;
}

export type ScrollContainerProps = ThemedClassName<
  PropsWithChildren<{
    autoScroll?: boolean;
    scrollInterval?: number;
  }>
>;

/**
 * Scroll container that automatically scrolls to the bottom when new content is added.
 */
// TODO(burdon): Custom scrollbar.
export const ScrollContainer = forwardRef<ScrollController, ScrollContainerProps>(
  ({ children, classNames, autoScroll = true, scrollInterval = 1_000 }, forwardedRef) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Determines if user scrolled.
    const autoScrollRef = useRef(false);

    // Controller.
    useImperativeHandle(
      forwardedRef,
      () => ({
        scrollToBottom: () => {
          invariant(containerRef.current);
          // NOTE: Should be instant otherwise scrollHeight might be out of date.
          containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'instant' });
          autoScrollRef.current = false;
        },
      }),
      [],
    );

    // Auto scroll.
    // Scroll based on an interval rather than continuously (which causes jitter).
    const [sticky, setSticky] = useState(true);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
      if (!autoScroll || !sticky || !containerRef.current) {
        return;
      }

      autoScrollRef.current = true;
      if (timerRef.current == null && containerRef.current.scrollTop < containerRef.current.scrollHeight) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          if (containerRef.current) {
            containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
          }
        }, scrollInterval);
      }
    }, [children]);
    useEffect(() => {
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }, []);

    // Detect scroll to end.
    useEffect(() => {
      invariant(containerRef.current);
      const handleScrollEnd = () => {
        autoScrollRef.current = false;
      };

      containerRef.current.addEventListener('scrollend', handleScrollEnd);
      return () => containerRef.current?.removeEventListener('scrollend', handleScrollEnd);
    }, []);

    // User scrolling.
    const handleScroll = useCallback<UIEventHandler<HTMLDivElement>>((ev) => {
      if (autoScrollRef.current) {
        return;
      }

      const { scrollTop, clientHeight, scrollHeight } = ev.currentTarget;
      const sticky = scrollTop + clientHeight >= scrollHeight;
      setSticky(sticky);
    }, []);

    // TOOD(burdon): Wrap with ScrollArea.
    return (
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={mx('flex flex-col grow overflow-x-hidden overflow-y-auto scrollbar-none contain-layout', classNames)}
      >
        {children}
      </div>
    );
  },
);
