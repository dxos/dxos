//
// Copyright 2025 DXOS.org
//

import { useState } from '@preact-signals/safe-react/react';
import { createContext } from '@radix-ui/react-context';
import React, {
  type HTMLAttributes,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';

import { addEventListener, combine } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { type ThemedClassName, useDynamicRef, useForwardedRef } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const isBottom = (el: HTMLElement | null) => {
  return !!(el && el.scrollHeight - el.scrollTop === el.clientHeight);
};

export interface ScrollController {
  viewport: HTMLDivElement | null;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

type ScrollContainerContextValue = {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  controller?: ScrollController;
  pinned?: boolean;
};

const [ScrollContainerProvider, useScrollContainerContext] =
  createContext<ScrollContainerContextValue>('ScrollContainer');

//
// Root
//

export type RootProps = ThemedClassName<
  PropsWithChildren<{
    pin?: boolean;
    fade?: boolean;
  }>
>;

/**
 * Scroll container that automatically scrolls to the bottom when new content is added.
 */
const Root = forwardRef<ScrollController, RootProps>(({ children, classNames, pin, fade }, forwardedRef) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(false);
  const [overflow, setOverflow] = useState(false);
  const [pinned, setPinned] = useState(pin);
  const pinnedRef = useDynamicRef(pinned);

  const timeoutRef = useRef<NodeJS.Timeout>();
  const handleScrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollerRef.current) {
      // Temporarily hide scrollbar to prevent flicker.
      autoScrollRef.current = true;
      scrollerRef.current.classList.add('cm-hide-scrollbar');
      scrollerRef.current.scrollTo({
        top: scrollerRef.current.scrollHeight,
        behavior,
      });

      clearTimeout(timeoutRef.current);
      if (behavior !== 'instant') {
        timeoutRef.current = setTimeout(() => {
          // scrollerRef.current?.classList.remove('cm-hide-scrollbar');
          autoScrollRef.current = false;
        }, 500);
      }
    }
  }, []);

  const controller = useMemo(
    () => ({
      viewport: scrollerRef.current,
      scrollToTop: () => {
        invariant(scrollerRef.current);
        scrollerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        setPinned(false);
      },
      scrollToBottom: () => {
        handleScrollToBottom('instant');
        setPinned(true);
      },
    }),
    [handleScrollToBottom, scrollerRef.current],
  );

  // Scroll controller imperative ref.
  useImperativeHandle(forwardedRef, () => controller, [controller]);

  // Listen for scroll events.
  useEffect(() => {
    if (!scrollerRef.current) {
      return;
    }

    // Listen for scroll events.
    let hitBottom = false;
    let wheelTimeout: NodeJS.Timeout | undefined = undefined;
    return combine(
      addEventListener(scrollerRef.current, 'wheel', () => {
        pinnedRef.current = wheelTimeout ? isBottom(scrollerRef.current) : false;
        // Wheel event will continue due to momentum.
        hitBottom = hitBottom || pinnedRef.current;
        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
          wheelTimeout = undefined;
          pinnedRef.current = hitBottom;
          hitBottom = false;
        }, 200);
      }),
      addEventListener(scrollerRef.current, 'scroll', () => {
        setOverflow((scrollerRef.current?.scrollTop ?? 0) > 0);
        pinnedRef.current = isBottom(scrollerRef.current);
      }),
    );
  }, []);

  return (
    <ScrollContainerProvider pinned={pinned} controller={controller} scrollToBottom={handleScrollToBottom}>
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
          {children}
        </div>
      </div>
    </ScrollContainerProvider>
  );
});

//
// Content
//

type ContentProps = ThemedClassName<PropsWithChildren<Omit<HTMLAttributes<HTMLDivElement>, 'className'>>>;

const Content = forwardRef<HTMLDivElement, ContentProps>(({ classNames, children, ...props }, forwardedRef) => {
  const contentRef = useForwardedRef(forwardedRef);
  const { pinned, scrollToBottom } = useScrollContainerContext(Content.displayName!);

  useEffect(() => {
    if (!pinned || !contentRef.current) {
      return;
    }

    // Setup resize observer to detect content changes.
    const resizeObserver = new ResizeObserver(() => scrollToBottom());
    scrollToBottom('instant');

    resizeObserver.observe(contentRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [pinned, scrollToBottom]);

  return (
    <div className={mx('is-full', classNames)} {...props} ref={contentRef}>
      {children}
    </div>
  );
});

Content.displayName = 'ScrollContainer.Content';

//
// ScrollContainer
//

export const ScrollContainer = {
  Root,
  Content,
};

export type { RootProps as ScrollContainerRootProps, ContentProps as ScrollContainerContentProps };
