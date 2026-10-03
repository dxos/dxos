//
// Copyright 2026 DXOS.org
//

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
import { useComposedRefs } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { composableProps, slottable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { Button } from '../Button/index.ts';
import { ScrollArea, type ScrollAreaRootProps } from '../ScrollArea/index.ts';
import { ScrollContainerProvider, type ScrollController, useScrollContainerContext } from './ScrollContainerContext.ts';

// Within a pixel: at fractional zoom the three measures round differently, so exact equality never holds at the end.
const isBottom = (element: HTMLElement) =>
  Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) <= 1;

//
// Root
//

type ScrollContainerRootProps = PropsWithChildren<{
  /** Start pinned to the end, following content as it grows (a log, a chat). */
  pin?: boolean;
  /** How a pinned container follows new content. */
  behavior?: ScrollBehavior;
}>;

/**
 * Headless: holds the pinned and overflow state its parts share, and exposes a {@link ScrollController} as its ref.
 * Scrolling up (by wheel) unpins; scrolling back to the end, or `scrollToBottom`, pins again.
 */
const ScrollContainerRoot = forwardRef<ScrollController, ScrollContainerRootProps>(
  ({ children, pin = false, behavior: defaultBehavior = 'smooth' }, forwardedRef) => {
    const viewportRef = useRef<HTMLElement | null>(null);
    const [pinned, setPinned] = useState(pin);
    const [overflow, setOverflow] = useState(false);

    const controller = useMemo<ScrollController>(
      () => ({
        get viewport() {
          return viewportRef.current;
        },
        scrollToTop: (behavior = defaultBehavior) => {
          viewportRef.current?.scrollTo({ top: 0, behavior });
          setPinned(false);
        },
        scrollToBottom: (behavior = defaultBehavior) => {
          const viewport = viewportRef.current;
          viewport?.scrollTo({ top: viewport.scrollHeight, behavior });
          setPinned(true);
        },
      }),
      [defaultBehavior],
    );

    useImperativeHandle(forwardedRef, () => controller, [controller]);

    const setViewport = useCallback((viewport: HTMLElement | null) => {
      viewportRef.current = viewport;
    }, []);

    return (
      <ScrollContainerProvider
        controller={controller}
        pinned={pinned}
        overflow={overflow}
        setViewport={setViewport}
        setPinned={setPinned}
        setOverflow={setOverflow}
      >
        {children}
      </ScrollContainerProvider>
    );
  },
);

ScrollContainerRoot.displayName = 'ScrollContainer.Root';

//
// Content
//

type ScrollContainerContentProps = Pick<ScrollAreaRootProps, 'size' | 'mode' | 'width' | 'native'>;

/** The frame: a `ScrollArea.Root` that also positions the Fade and the ScrollDownButton over the viewport. */
const ScrollContainerContent = slottable<HTMLDivElement, ScrollContainerContentProps>(
  ({ children, ...props }, forwardedRef) => (
    <ScrollArea.Root {...composableProps(props, { classNames: recipes.scrollContainer() })} ref={forwardedRef}>
      {children}
    </ScrollArea.Root>
  ),
);

ScrollContainerContent.displayName = 'ScrollContainer.Content';

//
// Viewport
//

type ScrollContainerViewportProps = {};

/** The scrolling element (`ScrollArea.Viewport`); while pinned it follows its children as they are added or grow. */
const ScrollContainerViewport = slottable<HTMLDivElement, ScrollContainerViewportProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const viewportRef = useRef<HTMLDivElement>(null);
    const ref = useComposedRefs(forwardedRef, viewportRef);
    const { setViewport, setPinned, setOverflow } = useScrollContainerContext('ScrollContainer.Viewport');

    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }

      setViewport(viewport);
      return combine(
        // Only a user's wheel decides pinning: a programmatic scroll to the end must not unpin midway.
        addEventListener(viewport, 'wheel', () => setPinned(isBottom(viewport))),
        addEventListener(viewport, 'scroll', () => setOverflow(viewport.scrollTop > 0)),
        () => setViewport(null),
      );
    }, [setViewport, setPinned, setOverflow]);

    return (
      <>
        <ScrollArea.Viewport asChild={asChild} {...props} ref={ref}>
          {children}
        </ScrollArea.Viewport>
        <ScrollContainerPinEffect viewportRef={viewportRef} />
      </>
    );
  },
);

ScrollContainerViewport.displayName = 'ScrollContainer.Viewport';

/** Kept apart from Viewport so that pinning does not re-render the viewport's children. */
const ScrollContainerPinEffect = ({ viewportRef }: { viewportRef: RefObject<HTMLDivElement | null> }) => {
  const { pinned, controller } = useScrollContainerContext('ScrollContainer.PinEffect');

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!pinned || !viewport) {
      return;
    }

    controller.scrollToBottom('instant');

    // The viewport keeps its size as content grows, so its children are what is observed (e.g. a streaming row).
    const resizeObserver = new ResizeObserver(() => controller.scrollToBottom());
    Array.from(viewport.children).forEach((child) => resizeObserver.observe(child));
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) =>
        mutation.addedNodes.forEach((node) => node instanceof Element && resizeObserver.observe(node)),
      );
      controller.scrollToBottom();
    });
    mutationObserver.observe(viewport, { childList: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [pinned, controller, viewportRef]);

  return null;
};

//
// Fade
//

type ScrollContainerFadeProps = ThemedClassName<{}>;

/** A gradient from the surface over the top edge, shown once content has scrolled under it. */
const ScrollContainerFade = ({ classNames }: ScrollContainerFadeProps) => {
  const { overflow } = useScrollContainerContext('ScrollContainer.Fade');
  return (
    <div
      aria-hidden
      data-scope='scroll-container'
      data-part='fade'
      data-state={overflow ? 'visible' : 'hidden'}
      className={mx(recipes.scrollContainerFade(), classNames)}
    />
  );
};

ScrollContainerFade.displayName = 'ScrollContainer.Fade';

//
// ScrollDownButton
//

type ScrollContainerScrollDownButtonProps = ThemedClassName<{
  /** Names the icon-only button. */
  label?: string;
}>;

/**
 * A floating icon button in the end corner, shown while unpinned, that scrolls to the end and pins again. It is a
 * Button, so it keeps Button's `data-scope`/`data-part`; `.dx-scroll-container-scroll-down` identifies it.
 */
const ScrollContainerScrollDownButton = ({
  classNames,
  label = 'Scroll down',
}: ScrollContainerScrollDownButtonProps) => {
  const { pinned, controller } = useScrollContainerContext('ScrollContainer.ScrollDownButton');
  return (
    <Button
      variant='primary'
      icon='ph--arrow-down--regular'
      iconOnly
      label={label}
      showTooltip={false}
      tabIndex={pinned ? -1 : undefined}
      aria-hidden={pinned || undefined}
      data-state={pinned ? 'hidden' : 'visible'}
      classNames={mx(recipes.scrollContainerScrollDown(), classNames)}
      onClick={() => controller.scrollToBottom()}
    />
  );
};

ScrollContainerScrollDownButton.displayName = 'ScrollContainer.ScrollDownButton';

export const ScrollContainer = {
  Root: ScrollContainerRoot,
  Content: ScrollContainerContent,
  Viewport: ScrollContainerViewport,
  Fade: ScrollContainerFade,
  ScrollDownButton: ScrollContainerScrollDownButton,
};

export type {
  ScrollContainerContentProps,
  ScrollContainerFadeProps,
  ScrollContainerRootProps,
  ScrollContainerScrollDownButtonProps,
  ScrollContainerViewportProps,
};
