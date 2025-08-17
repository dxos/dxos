//
// Copyright 2025 DXOS.org
//

import { useState } from '@preact-signals/safe-react/react';
import React, { type PropsWithChildren, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

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
  ({ children, classNames, pin, fade }, forwardedRef) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const pinnedRef = useRef(pin);
    const autoScrollRef = useRef(false);
    const [overflow, setOverflow] = useState(false);

    // Scroll controller imperative ref.
    useImperativeHandle(
      forwardedRef,
      () => ({
        viewport: scrollerRef.current,
        // NOTE: Should be instant otherwise scrollHeight might be out of date.
        scrollToTop: (behavior: ScrollBehavior = 'smooth') => {
          invariant(scrollerRef.current);
          scrollerRef.current.scrollTo({ top: 0, behavior });
          pinnedRef.current = false;
        },
        scrollToBottom: (behavior: ScrollBehavior = 'instant') => {
          invariant(scrollerRef.current);
          scrollerRef.current.scrollTo({ top: scrollerRef.current.scrollHeight, behavior });
          pinnedRef.current = true;
        },
      }),
      [],
    );

    // Listen for scroll events.
    useEffect(() => {
      if (!scrollerRef.current || !contentRef.current) {
        return;
      }

      const handleScroll = () => {
        setOverflow((scrollerRef.current?.scrollTop ?? 0) > 0);
        if (!autoScrollRef.current) {
          pinnedRef.current = false;
        }
      };

      // Listen for scroll events.
      scrollerRef.current.addEventListener('scroll', handleScroll);

      // Setup resize observer to detect content changes.
      let t: NodeJS.Timeout | undefined;
      const resizeObserver = new ResizeObserver(() => {
        if (scrollerRef.current && pinnedRef.current) {
          // Temporarily hide scrollbar to prevent flicker.
          autoScrollRef.current = true;
          scrollerRef.current.classList.add('cm-hide-scrollbar');
          scrollerRef.current.scrollTo({
            top: scrollerRef.current.scrollHeight,
            behavior: 'smooth',
          });
          t = setTimeout(() => {
            scrollerRef.current?.classList.remove('cm-hide-scrollbar');
            autoScrollRef.current = false;
          }, 500);
        }
      });
      resizeObserver.observe(contentRef.current);

      return () => {
        scrollerRef.current?.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
        clearTimeout(t);
      };
    }, []);

    return (
      <div className='relative grid flex-1 min-bs-0 overflow-hidden'>
        {fade && (
          <div
            role='none'
            data-visible={overflow}
            className={mx(
              // NOTE: Gradients may not be visible with dark reader extensions.
              'z-10 absolute block-start-0 inset-inline-0 bs-24 is-full',
              'opacity-0 duration-200 transition-opacity data-[visible="true"]:opacity-100',
              'bg-gradient-to-b from-[--surface-bg] to-transparent pointer-events-none',
            )}
          />
        )}
        <div className={mx('flex flex-col min-bs-0 overflow-y-auto scrollbar-thin', classNames)} ref={scrollerRef}>
          <div className='is-full' ref={contentRef}>
            {children}
          </div>
        </div>
      </div>
    );
  },
);
