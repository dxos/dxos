//
// Copyright 2025 DXOS.org
//

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
  useState,
} from 'react';

import { addEventListener, combine } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { composableProps, mx } from '@dxos/ui-theme';

import { type ThemedClassName } from '../../util';
import { IconButton } from '../Button';
import { ScrollArea } from '../ScrollArea';
import { ComposableProps } from '@dxos/ui-types';

const isBottom = (el: HTMLElement | null) => {
  return !!(el && el.scrollHeight - el.scrollTop === el.clientHeight);
};

export interface ScrollController {
  viewport: HTMLDivElement | null;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

type ScrollContainerContextValue = {
  controller?: ScrollController;
  pinned?: boolean;
  /** Called by Viewport to register/unregister the scroll element. */
  setViewport: (el: HTMLDivElement | null) => void;
  /** Called by Viewport on wheel events to update pinned state. */
  setPinned: (value: boolean) => void;
};

const [ScrollContainerProvider, useScrollContainerContext] =
  createContext<ScrollContainerContextValue>('ScrollContainer');

//
// Root
//

type RootProps = ThemedClassName<
  PropsWithChildren<{
    pin?: boolean;
    behavior?: ScrollBehavior;
  }>
>;

/**
 * Headless scroll container that provides context for scroll state.
 * Render ScrollContainer.Viewport as a child to provide the scrollable area.
 */
const Root = forwardRef<ScrollController, RootProps>(
  ({ children, pin, behavior: behaviorProp = 'smooth' }, forwardedRef) => {
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const autoScrollRef = useRef(false);
    const [pinned, setPinned] = useState(pin);

    const timeoutRef = useRef<NodeJS.Timeout>(undefined);
    const scrollToBottom = useCallback(
      (behavior: ScrollBehavior = behaviorProp) => {
        if (scrollerRef.current) {
          // Temporarily hide scrollbar to prevent flickering.
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
      },
      [behaviorProp],
    );

    const controller = useMemo<ScrollController>(
      () => ({
        get viewport() {
          return scrollerRef.current;
        },
        scrollToTop: () => {
          invariant(scrollerRef.current);
          scrollerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          setPinned(false);
        },
        scrollToBottom: () => {
          scrollToBottom('smooth');
        },
      }),
      [scrollToBottom],
    );

    // Scroll controller imperative ref.
    useImperativeHandle(forwardedRef, () => controller, [controller]);

    // Called by Viewport when the scroll element mounts/unmounts.
    const setViewport = useCallback((el: HTMLDivElement | null) => {
      scrollerRef.current = el;
    }, []);

    return (
      <ScrollContainerProvider pinned={pinned} controller={controller} setViewport={setViewport} setPinned={setPinned}>
        {children}
      </ScrollContainerProvider>
    );
  },
);

Root.displayName = 'ScrollContainer.Root';

//
// Viewport
//

const VIEWPORT_NAME = 'ScrollContainer.Viewport';

type ViewportProps = ComposableProps<
  HTMLDivElement,
  {
    fade?: boolean;
  }
>;

const Viewport = forwardRef<HTMLDivElement, ViewportProps>(({ classNames, children, fade, ...props }, forwardedRef) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const { pinned, controller, setViewport, setPinned } = useScrollContainerContext(VIEWPORT_NAME);

  // Register the scroll element with Root and set up wheel/scroll listeners.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }

    setViewport(el);

    return combine(
      addEventListener(el, 'wheel', () => setPinned(isBottom(el))),
      addEventListener(el, 'scroll', () => setOverflow((el.scrollTop ?? 0) > 0)),
      () => setViewport(null),
    );
  }, [setViewport, setPinned]);

  // Pin scroll to bottom when content changes.
  useEffect(() => {
    if (!pinned || !scrollerRef.current) {
      return;
    }

    // Scroll instantly otherwise it might move while we're scrolling.
    controller?.scrollToBottom();

    // Setup resize observer to detect content changes.
    const resizeObserver = new ResizeObserver(() => controller?.scrollToBottom());
    resizeObserver.observe(scrollerRef.current);
    return () => resizeObserver.disconnect();
  }, [pinned, controller]);

  return (
    <div {...composableProps(props, { className: 'relative grid dx-container' })} ref={forwardedRef}>
      {fade && (
        <div
          role='none'
          data-visible={overflow}
          className={mx(
            // NOTE: Gradients may not be visible with dark reader extensions.
            'z-10 absolute top-0 inset-x-0 h-24 w-full',
            'opacity-0 duration-200 transition-opacity data-[visible="true"]:opacity-100',
            'bg-gradient-to-b from-(--surface-bg) to-transparent pointer-events-none',
          )}
        />
      )}
      <ScrollArea.Root thin margin classNames={mx(classNames)}>
        <ScrollArea.Viewport ref={scrollerRef}>{children}</ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
});

Viewport.displayName = VIEWPORT_NAME;

//
// ScrollDownButton
//

const SCROLL_DOWN_BUTTON_NAME = 'ScrollContainer.ScrollDownButton';

type ScrollDownButtonProps = ThemedClassName;

const ScrollDownButton = ({ classNames }: ScrollDownButtonProps) => {
  const { pinned, controller } = useScrollContainerContext(SCROLL_DOWN_BUTTON_NAME);

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
        onClick={() => controller?.scrollToBottom()}
      />
    </div>
  );
};

ScrollDownButton.displayName = SCROLL_DOWN_BUTTON_NAME;

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
