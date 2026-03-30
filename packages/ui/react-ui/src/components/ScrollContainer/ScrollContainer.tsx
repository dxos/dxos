//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type PropsWithChildren,
  type RefObject,
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
import { useMergeRefs } from '@dxos/react-hooks';
import { composableProps, mx } from '@dxos/ui-theme';
import { SlottableProps } from '@dxos/ui-types';

import { type ThemedClassName } from '../../util';
import { IconButton } from '../Button';
import { ScrollArea } from '../ScrollArea';

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
  overflow?: boolean;
  /** Called by Viewport to register/unregister the scroll element. */
  setViewport: (el: HTMLDivElement | null) => void;
  /** Called by Viewport on wheel events to update pinned state. */
  setPinned: (value: boolean) => void;
  /** Called by Viewport on scroll events to update overflow state. */
  setOverflow: (value: boolean) => void;
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
    const [overflow, setOverflow] = useState(false);

    const timeoutRef = useRef<NodeJS.Timeout>(undefined);
    const scrollToBottom = useCallback(
      (behavior: ScrollBehavior = behaviorProp) => {
        if (scrollerRef.current) {
          if (behavior !== 'instant') {
            // Temporarily hide scrollbar to prevent flickering during smooth scroll.
            // For instant scrolling we skip this — there's no animation to hide,
            // and adding the class changes element size which re-fires the ResizeObserver.
            autoScrollRef.current = true;
            scrollerRef.current.classList.add('scrollbar-none');
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              scrollerRef.current?.classList.remove('scrollbar-none');
              autoScrollRef.current = false;
            }, 500);
          }

          scrollerRef.current.scrollTo({
            top: scrollerRef.current.scrollHeight,
            behavior,
          });

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
        scrollToBottom: (behavior = 'smooth' as ScrollBehavior) => {
          scrollToBottom(behavior);
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
      <ScrollContainerProvider
        pinned={pinned}
        overflow={overflow}
        controller={controller}
        setViewport={setViewport}
        setPinned={setPinned}
        setOverflow={setOverflow}
      >
        <ScrollArea.Root thin centered padding className='relative'>
          {children}
        </ScrollArea.Root>
      </ScrollContainerProvider>
    );
  },
);

Root.displayName = 'ScrollContainer.Root';

//
// Viewport
//

const VIEWPORT_NAME = 'ScrollContainer.Viewport';

type ViewportProps = SlottableProps;

const Viewport = forwardRef<HTMLDivElement, ViewportProps>(({ children, ...props }, forwardedRef) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergeRefs([forwardedRef, scrollerRef]);
  const { setViewport, setPinned, setOverflow } = useScrollContainerContext(VIEWPORT_NAME);

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
  }, [setViewport, setPinned, setOverflow]);

  return (
    <>
      <ScrollArea.Viewport {...composableProps(props)} ref={mergedRef}>
        {children}
      </ScrollArea.Viewport>
      <PinEffect scrollerRef={scrollerRef} />
    </>
  );
});

Viewport.displayName = VIEWPORT_NAME;

/**
 * Isolated component that consumes pinned/controller from context.
 * Kept separate so that Viewport does not re-render when pinned changes.
 */
const PIN_EFFECT_NAME = 'ScrollContainer.PinEffect';

const PinEffect = ({ scrollerRef }: { scrollerRef: RefObject<HTMLDivElement | null> }) => {
  const { pinned, controller } = useScrollContainerContext(PIN_EFFECT_NAME);

  // Pin scroll to bottom when content changes.
  useEffect(() => {
    const viewport = scrollerRef.current;
    if (!pinned || !viewport) {
      return;
    }

    // Scroll instantly so we don't visually jump while content is being added.
    controller?.scrollToBottom('instant');

    // Setup resize observer on content children to detect size changes (e.g. streaming).
    // We observe children rather than the viewport itself, because the viewport's size
    // stays fixed — only its content grows.
    // Use instant scroll in the callback — smooth scrolling adds/removes the
    // scrollbar-none class, which changes the element size and re-fires the
    // observer, creating an infinite loop.
    const resizeObserver = new ResizeObserver(() => controller?.scrollToBottom('smooth'));
    Array.from(viewport.children).forEach((child) => {
      resizeObserver.observe(child);
    });

    // Watch for added/removed children.
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            resizeObserver.observe(node);
          }
        });
      });

      controller?.scrollToBottom('smooth');
    });
    mutationObserver.observe(viewport, { childList: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [pinned, controller, scrollerRef]);

  return null;
};

//
// Fade
//

const FADE_NAME = 'ScrollContainer.Fade';

type FadeProps = {};

const Fade = () => {
  const { overflow } = useScrollContainerContext(FADE_NAME);

  return (
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
  );
};

Fade.displayName = FADE_NAME;

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
  Fade,
  ScrollDownButton,
};

export type {
  RootProps as ScrollContainerRootProps,
  ViewportProps as ScrollContainerViewportProps,
  FadeProps as ScrollContainerFadeProps,
  ScrollDownButtonProps as ScrollContainerScrollDownButtonProps,
};
