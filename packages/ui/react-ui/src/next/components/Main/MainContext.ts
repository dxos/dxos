//
// Copyright 2023 DXOS.org
//

import {
  type ComponentPropsWithoutRef,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { log } from '@dxos/log';
import { useFocusGroup } from '@dxos/react-focus';
import { createContext, useComposedRefs } from '@dxos/react-hooks';

export const MAIN_NAME = 'Main';

// Kept out of `Main.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

//
// Landmark
//

const landmarkAttr = 'data-main-landmark';

/**
 * The focusable landmarks in Tab order: by their order value, then by document order, so several areas may share one
 * (e.g. a deck's planks); hidden and inert ones are skipped.
 */
const getLandmarks = (document: Document): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(`[${landmarkAttr}]`))
    .filter((element) => !element.closest('[inert]') && element.checkVisibility())
    .map((element, index) => ({ element, index, order: parseFloat(element.getAttribute(landmarkAttr) ?? '') }))
    .sort((left, right) => left.order - right.order || left.index - right.index)
    .map(({ element }) => element);

/**
 * Facilitates moving focus between landmarks.
 * Ref https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/landmark_role
 */
export const useLandmarkMover = (propsOnKeyDown: ComponentPropsWithoutRef<'div'>['onKeyDown'], landmark: string) => {
  // TODO(thure): This was disconnected once before in #8818;
  //  if this should change again to support the browser extension, please ensure the change doesn’t break web, desktop and mobile.
  // `Tab` is ignored because the landmark traversal below owns it.
  const {
    ref,
    onKeyDown: onFocusGroupKeyDown,
    onFocus,
    ...focusGroupAttrs
  } = useFocusGroup({ tabBehavior: 'limited', ignoreKeys: ['Tab'] });

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      // On a focused landmark, ArrowLeft/ArrowRight move between landmarks as Shift+Tab/Tab do.
      const step =
        event.key === 'Tab'
          ? event.getModifierState('Shift')
            ? -1
            : 1
          : event.key === 'ArrowLeft'
            ? -1
            : event.key === 'ArrowRight'
              ? 1
              : 0;
      if (event.target === target && step !== 0 && target.hasAttribute(landmarkAttr)) {
        event.preventDefault();
        event.stopPropagation();
        const landmarks = getLandmarks(target.ownerDocument);
        const count = landmarks.length;
        const cursor = landmarks.indexOf(target);
        landmarks[(cursor + count + step) % count]?.focus();
        return;
      }
      onFocusGroupKeyDown(event);
      propsOnKeyDown?.(event);
    },
    [onFocusGroupKeyDown, propsOnKeyDown],
  );

  return {
    [landmarkAttr]: landmark,
    tabIndex: 0,
    ref,
    onKeyDown: handleKeyDown,
    onFocus,
    ...focusGroupAttrs,
  };
};

//
// Context
//

export type SidebarState = 'expanded' | 'collapsed' | 'closed';

export type DrawerState = 'open' | 'closed';

/** Height in rem. */
export const DRAWER_DEFAULT_HEIGHT = 24;
/** Drag bounds in rem; exported so operations persisting a height cannot exceed what a drag can reach. */
export const DRAWER_MIN_HEIGHT = 8;
export const DRAWER_MAX_HEIGHT = 64;

export type MainContextValue = {
  resizing: boolean;

  // Navigation
  navigationSidebarState: SidebarState;
  setNavigationSidebarState: Dispatch<SetStateAction<SidebarState | undefined>>;

  // Complementary
  complementarySidebarState: SidebarState;
  setComplementarySidebarState: Dispatch<SetStateAction<SidebarState | undefined>>;

  // Drawer
  drawerState: DrawerState;
  setDrawerState: Dispatch<SetStateAction<DrawerState | undefined>>;
  /** Height in rem. */
  drawerHeight: number;
  setDrawerHeight: Dispatch<SetStateAction<number | undefined>>;
  /** Fired when a resize drag ends: the moment to persist. */
  onDrawerHeightChangeEnd?: (next: number) => void;
};

export const [MainProvider, useMainContext] = createContext<MainContextValue>(MAIN_NAME, {
  resizing: false,

  navigationSidebarState: 'closed',
  setNavigationSidebarState: (_nextState) => {
    log.warn('Not initialized');
  },

  complementarySidebarState: 'closed',
  setComplementarySidebarState: (_nextState) => {
    log.warn('Not initialized');
  },

  drawerState: 'closed',
  setDrawerState: (_nextState) => {
    log.warn('Not initialized');
  },
  drawerHeight: DRAWER_DEFAULT_HEIGHT,
  setDrawerHeight: (_nextHeight) => {
    log.warn('Not initialized');
  },
});

export const useSidebars = (consumerName: string) => {
  const {
    navigationSidebarState,
    setNavigationSidebarState,

    complementarySidebarState,
    setComplementarySidebarState,
  } = useMainContext(consumerName);

  return {
    navigationSidebarState,
    setNavigationSidebarState,
    toggleNavigationSidebar: useCallback(
      () => setNavigationSidebarState(navigationSidebarState === 'expanded' ? 'closed' : 'expanded'),
      [navigationSidebarState, setNavigationSidebarState],
    ),
    openNavigationSidebar: useCallback(() => setNavigationSidebarState('expanded'), []),
    collapseNavigationSidebar: useCallback(() => setNavigationSidebarState('collapsed'), []),
    closeNavigationSidebar: useCallback(() => setNavigationSidebarState('closed'), []),

    complementarySidebarState,
    setComplementarySidebarState,
    toggleComplementarySidebar: useCallback(
      () => setComplementarySidebarState(complementarySidebarState === 'expanded' ? 'closed' : 'expanded'),
      [complementarySidebarState, setComplementarySidebarState],
    ),
    openComplementarySidebar: useCallback(() => setComplementarySidebarState('expanded'), []),
    collapseComplementarySidebar: useCallback(() => setComplementarySidebarState('collapsed'), []),
    closeComplementarySidebar: useCallback(() => setComplementarySidebarState('closed'), []),
  };
};

/**
 * Makes an element a focus area of the shell, beside the sidebars (order 0 and 2) and the content (1): Tab moves between
 * areas in `order` and the focused one draws the landmark ring. For a region that holds several areas, e.g. a
 * navigation sidebar's rail and panel (0 and 0.5) or a plank and its companion (1 and 1.5), whose own landmark is then
 * turned off.
 */
export const useMainLandmark = (order: number, onKeyDown?: ComponentPropsWithoutRef<'div'>['onKeyDown']) => {
  const { ref: moverRef, ...props } = useLandmarkMover(onKeyDown, String(order));
  const [element, setElement] = useState<HTMLElement | null>(null);
  // A host machine may manage the element's tabindex (Ark's tab panel drops it once the panel holds focusables), and a
  // landmark without one cannot take focus, so it is restored whenever it is removed.
  useEffect(() => {
    if (!element) {
      return;
    }
    const restore = () => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
    };
    restore();
    const observer = new MutationObserver(restore);
    observer.observe(element, { attributes: true, attributeFilter: ['tabindex'] });
    return () => observer.disconnect();
  }, [element]);
  return { ...props, ref: useComposedRefs<HTMLElement>(moverRef, setElement) };
};
