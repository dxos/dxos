//
// Copyright 2023 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import {
  type ComponentPropsWithoutRef,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
  useCallback,
} from 'react';

import { log } from '@dxos/log';
import { useFocusGroup } from '@dxos/react-focus';

export const MAIN_NAME = 'Main';

// Kept out of `Main.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

//
// Landmark
//

const landmarkAttr = 'data-main-landmark';

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
      const target = event.target as HTMLDivElement;
      if (event.target === event.currentTarget && event.key === 'Tab' && target.hasAttribute(landmarkAttr)) {
        event.preventDefault();
        const landmarks = Array.from(document.querySelectorAll(`[${landmarkAttr}]:not([inert])`))
          .map((el) => (el.hasAttribute(landmarkAttr) ? parseInt(el.getAttribute(landmarkAttr)!) : NaN))
          .sort();
        const l = landmarks.length;
        const cursor = landmarks.indexOf(parseInt(target.getAttribute(landmarkAttr)!));
        const nextLandmark = landmarks[(cursor + l + (event.getModifierState('Shift') ? -1 : 1)) % l];
        (document.querySelector(`[${landmarkAttr}="${nextLandmark}"]`) as HTMLDivElement | null)?.focus();
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

// TODO(burdon): Define collapsed state.
export type SidebarState = 'expanded' | 'collapsed' | 'closed';

export type MainContextValue = {
  resizing: boolean;

  // Navigation
  navigationSidebarState: SidebarState;
  setNavigationSidebarState: Dispatch<SetStateAction<SidebarState | undefined>>;

  // Complementary
  complementarySidebarState: SidebarState;
  setComplementarySidebarState: Dispatch<SetStateAction<SidebarState | undefined>>;
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
