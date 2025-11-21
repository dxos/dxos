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

// TODO(burdon): Move these deps to @dxos/dom-util.
import { addEventListener, combine } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { useForwardedRef } from '@dxos/react-hooks';
import { mx } from '@dxos/react-ui-theme';

import { type ThemedClassName } from '../../util';
import { IconButton } from '../Button';

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

type RootProps = ThemedClassName<
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

  const timeoutRef = useRef<NodeJS.Timeout>(undefined);
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'instant') => {
    if (scrollerRef.current) {
      // Temporarily hide scrollbar to prevent flicker.
      autoScrollRef.current = true;
      scrollerRef.current.classList.add('scrollbar-none');
      scrollerRef.current.scrollTo({
        top: scrollerRef.current.scrollHeight,
        behavior,
      });

      clearTimeout(timeoutRef.current);
      if (behavior !== 'instant') {
        timeoutRef.current = setTimeout(() => {
          scrollerRef.current?.classList.remove('scrollbar-none');
          autoScrollRef.current = false;
        }, 500);
      }
      setPinned(true);
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
        scrollToBottom('smooth');
      },
    }),
    [scrollToBottom, scrollerRef.current],
  );

  // Scroll controller imperative ref.
  useImperativeHandle(forwardedRef, () => controller, [controller]);

  // Listen for scroll events.
  useEffect(() => {
    if (!scrollerRef.current) {
      return;
    }

    return combine(
      // Check if user scrolls.
      addEventListener(scrollerRef.current, 'wheel', () => {
        setPinned(isBottom(scrollerRef.current));
      }),
      // Check if scrolls.
      addEventListener(scrollerRef.current, 'scroll', () => {
        setOverflow((scrollerRef.current?.scrollTop ?? 0) > 0);
      }),
    );
  }, []);

  return (
    <ScrollContainerProvider pinned={pinned} controller={controller} scrollToBottom={scrollToBottom}>
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

Root.displayName = 'ScrollContainer.Root';

//
// Viewport
//

type ViewportProps = ThemedClassName<PropsWithChildren<Omit<HTMLAttributes<HTMLDivElement>, 'className'>>>;

const Viewport = forwardRef<HTMLDivElement, ViewportProps>(({ classNames, children, ...props }, forwardedRef) => {
  const contentRef = useForwardedRef(forwardedRef);
  const { pinned, scrollToBottom } = useScrollContainerContext(Viewport.displayName!);

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

Viewport.displayName = 'ScrollContainer.Viewport';

//
// ScrollDownButton
//

type ScrollDownButtonProps = ThemedClassName;

const ScrollDownButton = ({ classNames }: ScrollDownButtonProps) => {
  const { pinned, scrollToBottom } = useScrollContainerContext(ScrollDownButton.displayName!);

  return (
    <div
      role='none'
      className={mx(
        'absolute bottom-2 right-4 opacity-100 transition-opacity duration-300',
        pinned && 'opacity-0',
        classNames,
      )}
    >
      <IconButton
        variant='primary'
        icon='ph--arrow-down--regular'
        iconOnly
        size={4}
        label='Scroll down'
        onClick={() => scrollToBottom()}
      />
    </div>
  );
};

ScrollDownButton.displayName = 'ScrollContainer.ScrollDownButton';

//
// ScrollContainer
//

export { useScrollContainerContext };

export const ScrollContainer = {
  Root,
  Viewport,
  ScrollDownButton,
};

export type {
  RootProps as ScrollContainerRootProps,
  ViewportProps as ScrollContainerViewportProps,
  ScrollDownButtonProps as ScrollContainerScrollDownButtonProps,
};
