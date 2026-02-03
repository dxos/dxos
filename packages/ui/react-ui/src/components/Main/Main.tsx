//
// Copyright 2023 DXOS.org
//

import { useFocusableGroup } from '@fluentui/react-tabster';
import { createContext } from '@radix-ui/react-context';
import { DialogContent, Root as DialogRoot, DialogTitle } from '@radix-ui/react-dialog';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  type Dispatch,
  type KeyboardEvent,
  type PropsWithChildren,
  type SetStateAction,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { log } from '@dxos/log';
import { useForwardedRef, useMediaQuery, useViewportResize } from '@dxos/react-hooks';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { type Label, toLocalizedString, useTranslation } from '../ThemeProvider';

import { useSwipeToDismiss } from './useSwipeToDismiss';

const MAIN_NAME = 'Main';
const MAIN_ROOT_NAME = 'MainRoot';
const NAVIGATION_SIDEBAR_NAME = 'NavigationSidebar';
const COMPLEMENTARY_SIDEBAR_NAME = 'ComplementarySidebar';
const DRAWER_NAME = 'Drawer';

//
// Landmark
//

const landmarkAttr = 'data-main-landmark';

/**
 * Facilitates moving focus between landmarks.
 * Ref https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/landmark_role
 */
const useLandmarkMover = (propsOnKeyDown: ComponentPropsWithoutRef<'div'>['onKeyDown'], landmark: string) => {
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
      propsOnKeyDown?.(event);
    },
    [propsOnKeyDown],
  );

  // TODO(thure): This was disconnected once before in #8818;
  //  if this should change again to support the browser extension, please ensure the change doesn’t break web, desktop and mobile.
  const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited', ignoreDefaultKeydown: { Tab: true } });

  return {
    onKeyDown: handleKeyDown,
    [landmarkAttr]: landmark,
    tabIndex: 0,
    ...focusableGroupAttrs,
  };
};

/**
 * Detects if drawer should be in full mode based on:
 * - Device is mobile (width)
 * - Visual viewport is constrained (keyboard visible)
 */
const useDrawerFullMode = () => {
  const [shouldBeFullMode, setShouldBeFullMode] = useState(false);

  const checkViewport = useCallback(() => {
    const isMobile = window.innerHeight <= 1000;
    setShouldBeFullMode(window.visualViewport && isMobile ? window.visualViewport.height < 700 : false);

    // Update CSS custom property with actual visual viewport height for full mode
    if (window.visualViewport) {
      document.documentElement.style.setProperty('--visual-viewport-height', `${window.visualViewport.height}px`);
    }
  }, []);

  useViewportResize(checkViewport, [], 100);

  // Also check on window resize (for device orientation changes)
  useEffect(() => {
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, [checkViewport]);

  return shouldBeFullMode;
};

//
// Context
//

type SidebarState = 'expanded' | 'collapsed' | 'closed';
type DrawerState = 'expanded' | 'full' | 'closed';

type MainContextValue = {
  resizing: boolean;
  navigationSidebarState: SidebarState;
  setNavigationSidebarState: Dispatch<SetStateAction<SidebarState | undefined>>;
  complementarySidebarState: SidebarState;
  setComplementarySidebarState: Dispatch<SetStateAction<SidebarState | undefined>>;
  drawerState: DrawerState;
  setDrawerState: Dispatch<SetStateAction<DrawerState | undefined>>;
};

const [MainProvider, useMainContext] = createContext<MainContextValue>(MAIN_NAME, {
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
});

const useSidebars = (consumerName: string) => {
  const {
    navigationSidebarState,
    setNavigationSidebarState,
    complementarySidebarState,
    setComplementarySidebarState,
    drawerState,
    setDrawerState,
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

    drawerState,
    setDrawerState,
    toggleDrawer: useCallback(
      () => setDrawerState(drawerState === 'expanded' ? 'closed' : 'expanded'),
      [drawerState, setDrawerState],
    ),
    openDrawer: useCallback(() => setDrawerState('expanded'), []),
    closeDrawer: useCallback(() => setDrawerState('closed'), []),
  };
};

// TODO(burdon): Combine to single state/callback.
type MainRootProps = PropsWithChildren<{
  navigationSidebarState?: SidebarState;
  defaultNavigationSidebarState?: SidebarState;
  onNavigationSidebarStateChange?: (nextState: SidebarState) => void;

  complementarySidebarState?: SidebarState;
  defaultComplementarySidebarState?: SidebarState;
  onComplementarySidebarStateChange?: (nextState: SidebarState) => void;

  drawerState?: DrawerState;
  defaultDrawerState?: DrawerState;
  onDrawerStateChange?: (nextState: DrawerState) => void;
}>;

const resizeDebounce = 3000;

//
// Root
//

const MainRoot = ({
  navigationSidebarState: propsNavigationSidebarState,
  defaultNavigationSidebarState,
  onNavigationSidebarStateChange,

  complementarySidebarState: propsComplementarySidebarState,
  defaultComplementarySidebarState,
  onComplementarySidebarStateChange,

  drawerState: propsDrawerState,
  defaultDrawerState,
  onDrawerStateChange,

  children,
  ...props
}: MainRootProps) => {
  const [isLg] = useMediaQuery('lg');
  const [navigationSidebarState = isLg ? 'expanded' : 'collapsed', setNavigationSidebarState] =
    useControllableState<SidebarState>({
      prop: propsNavigationSidebarState,
      defaultProp: defaultNavigationSidebarState,
      onChange: onNavigationSidebarStateChange,
    });
  const [complementarySidebarState = isLg ? 'expanded' : 'collapsed', setComplementarySidebarState] =
    useControllableState<SidebarState>({
      prop: propsComplementarySidebarState,
      defaultProp: defaultComplementarySidebarState,
      onChange: onComplementarySidebarStateChange,
    });
  const [drawerState = 'closed', setDrawerState] = useControllableState<DrawerState>({
    prop: propsDrawerState,
    defaultProp: defaultDrawerState,
    onChange: onDrawerStateChange,
  });

  const shouldBeFullMode = useDrawerFullMode();

  // Auto-switch between expanded and full based on viewport
  useEffect(() => {
    if (drawerState === 'closed') {
      return;
    }

    if (shouldBeFullMode && drawerState === 'expanded') {
      setDrawerState('full');
    } else if (!shouldBeFullMode && drawerState === 'full') {
      setDrawerState('expanded');
    }
  }, [shouldBeFullMode, drawerState, setDrawerState]);

  const [resizing, setResizing] = useState(false);
  const resizeInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleResize = useCallback(() => {
    setResizing(true);
    if (resizeInterval.current) {
      clearTimeout(resizeInterval.current);
    }
    resizeInterval.current = setTimeout(() => {
      setResizing(false);
      resizeInterval.current = null;
    }, resizeDebounce);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return (
    <MainProvider
      {...props}
      {...{
        navigationSidebarState,
        setNavigationSidebarState,
        complementarySidebarState,
        setComplementarySidebarState,
        drawerState,
        setDrawerState,
      }}
      resizing={resizing}
    >
      {children}
    </MainProvider>
  );
};

MainRoot.displayName = MAIN_ROOT_NAME;

const handleOpenAutoFocus = (event: Event) => {
  !document.body.hasAttribute('data-is-keyboard') && event.preventDefault();
};

//
// Sidebar
//

type MainSidebarProps = ThemedClassName<ComponentPropsWithRef<typeof DialogContent>> & {
  swipeToDismiss?: boolean;
  state?: SidebarState;
  resizing?: boolean;
  onStateChange?: (nextState: SidebarState) => void;
  side: 'inline-start' | 'inline-end';
  label: Label;
};

const MainSidebar = forwardRef<HTMLDivElement, MainSidebarProps>(
  (
    { classNames, children, swipeToDismiss, onOpenAutoFocus, state, resizing, onStateChange, side, label, ...props },
    forwardedRef,
  ) => {
    const [isLg] = useMediaQuery('lg');
    const { tx } = useThemeContext();
    const { t } = useTranslation();
    const ref = useForwardedRef(forwardedRef);
    const noopRef = useRef(null);

    useSwipeToDismiss(swipeToDismiss ? ref : noopRef, {
      onDismiss: () => onStateChange?.('closed'),
    });

    // NOTE(thure): This is a workaround for something further down the tree grabbing focus on Escape. Adding this
    //   intervention to `Tabs.Root` or `Tabs.Tabpenel` instances is somehow ineffectual.
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        const focusGroupParent = (event.target as HTMLElement).closest('[data-tabster]');
        if (event.key === 'Escape' && focusGroupParent) {
          event.preventDefault();
          event.stopPropagation();
          (focusGroupParent as HTMLElement).focus();
        }
        props.onKeyDown?.(event);
      },
      [props.onKeyDown],
    );

    const Root = isLg ? Primitive.div : DialogContent;

    return (
      <DialogRoot open={state !== 'closed'} aria-label={toLocalizedString(label, t)} modal={false}>
        {!isLg && <DialogTitle className='sr-only'>{toLocalizedString(label, t)}</DialogTitle>}
        <Root
          {...(!isLg && { forceMount: true, tabIndex: -1, onOpenAutoFocus: onOpenAutoFocus ?? handleOpenAutoFocus })}
          {...(state === 'closed' && { inert: true })}
          {...props}
          data-side={side === 'inline-end' ? 'ie' : 'is'}
          data-state={state}
          data-resizing={resizing ? 'true' : 'false'}
          className={tx('main.sidebar', 'main__sidebar', {}, classNames)}
          onKeyDownCapture={handleKeyDown}
          ref={ref}
        >
          {children}
        </Root>
      </DialogRoot>
    );
  },
);

//
// Navigation Sidebar
//

type MainNavigationSidebarProps = Omit<MainSidebarProps, 'expanded' | 'side'>;

const MainNavigationSidebar = forwardRef<HTMLDivElement, MainNavigationSidebarProps>((props, forwardedRef) => {
  const { navigationSidebarState, setNavigationSidebarState, resizing } = useMainContext(NAVIGATION_SIDEBAR_NAME);
  const mover = useLandmarkMover(props.onKeyDown, '0');

  return (
    <MainSidebar
      {...mover}
      {...props}
      state={navigationSidebarState}
      onStateChange={setNavigationSidebarState}
      resizing={resizing}
      side='inline-start'
      ref={forwardedRef}
    />
  );
});

MainNavigationSidebar.displayName = NAVIGATION_SIDEBAR_NAME;

//
// Complementary Sidebar
//

type MainComplementarySidebarProps = Omit<MainSidebarProps, 'expanded' | 'side'>;

const MainComplementarySidebar = forwardRef<HTMLDivElement, MainComplementarySidebarProps>((props, forwardedRef) => {
  const { complementarySidebarState, setComplementarySidebarState, resizing } =
    useMainContext(COMPLEMENTARY_SIDEBAR_NAME);
  const mover = useLandmarkMover(props.onKeyDown, '2');

  return (
    <MainSidebar
      {...mover}
      {...props}
      state={complementarySidebarState}
      onStateChange={setComplementarySidebarState}
      resizing={resizing}
      side='inline-end'
      ref={forwardedRef}
    />
  );
});

MainComplementarySidebar.displayName = COMPLEMENTARY_SIDEBAR_NAME;

//
// Drawer
//

type MainDrawerProps = ThemedClassName<ComponentPropsWithRef<typeof DialogContent>> & {
  swipeToDismiss?: boolean;
  state?: DrawerState;
  resizing?: boolean;
  onStateChange?: (nextState: DrawerState) => void;
  label: Label;
};

const MainDrawer = forwardRef<HTMLDivElement, MainDrawerProps>(
  (
    { classNames, children, swipeToDismiss, onOpenAutoFocus, state, resizing, onStateChange, label, ...props },
    forwardedRef,
  ) => {
    const [isLg] = useMediaQuery('lg');
    const { tx } = useThemeContext();
    const { t } = useTranslation();
    const ref = useForwardedRef(forwardedRef);
    const noopRef = useRef(null);

    // TODO(burdon): Implement vertical swipe-to-dismiss for drawer.
    useSwipeToDismiss(swipeToDismiss ? ref : noopRef, {
      onDismiss: () => onStateChange?.('closed'),
    });

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        const focusGroupParent = (event.target as HTMLElement).closest('[data-tabster]');
        if (event.key === 'Escape' && focusGroupParent) {
          event.preventDefault();
          event.stopPropagation();
          (focusGroupParent as HTMLElement).focus();
        }
        props.onKeyDown?.(event);
      },
      [props.onKeyDown],
    );

    return (
      <Primitive.div
        {...(state === 'closed' && { inert: true })}
        {...(!isLg && { forceMount: true, tabIndex: -1, onOpenAutoFocus: onOpenAutoFocus ?? handleOpenAutoFocus })}
        {...props}
        role='region'
        aria-label={toLocalizedString(label, t)}
        data-state={state}
        data-resizing={resizing ? 'true' : 'false'}
        className={tx('main.drawer', 'main__drawer', {}, classNames)}
        onKeyDownCapture={handleKeyDown}
        ref={ref}
      >
        {children}
      </Primitive.div>
    );
  },
);

type MainDrawerRootProps = Omit<MainDrawerProps, 'state' | 'resizing' | 'onStateChange'>;

const MainDrawerRoot = forwardRef<HTMLDivElement, MainDrawerRootProps>((props, forwardedRef) => {
  const { drawerState, setDrawerState, resizing } = useMainContext(DRAWER_NAME);
  const mover = useLandmarkMover(props.onKeyDown, '3');

  return (
    <MainDrawer
      {...mover}
      {...props}
      state={drawerState}
      onStateChange={setDrawerState}
      resizing={resizing}
      ref={forwardedRef}
    />
  );
});

MainDrawerRoot.displayName = DRAWER_NAME;

//
// Content
//

type MainContentProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  asChild?: boolean;
  bounce?: boolean;
  handlesFocus?: boolean;
};

const MainContent = forwardRef<HTMLDivElement, MainContentProps>(
  ({ asChild, classNames, bounce, handlesFocus, children, role, ...props }: MainContentProps, forwardedRef) => {
    const { navigationSidebarState, complementarySidebarState, drawerState } = useMainContext(MAIN_NAME);
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : role ? 'div' : 'main';

    const mover = useLandmarkMover(props.onKeyDown, '1');

    return (
      <Root
        role={role}
        {...(handlesFocus && { ...mover })}
        {...props}
        data-sidebar-inline-start-state={navigationSidebarState}
        data-sidebar-inline-end-state={complementarySidebarState}
        data-drawer-state={drawerState}
        data-handles-focus={handlesFocus}
        className={tx('main.content', 'main', { bounce, handlesFocus }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

MainContent.displayName = MAIN_NAME;

type MainOverlayProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof Primitive.div>, 'children' | 'onClick'>>;

const MainOverlay = forwardRef<HTMLDivElement, MainOverlayProps>(({ classNames, ...props }, forwardedRef) => {
  const [isLg] = useMediaQuery('lg');
  const { navigationSidebarState, setNavigationSidebarState, complementarySidebarState, setComplementarySidebarState } =
    useMainContext(MAIN_NAME);
  const { tx } = useThemeContext();
  return (
    <div
      {...props}
      onClick={() => {
        setNavigationSidebarState('collapsed');
        setComplementarySidebarState('collapsed');
      }}
      className={tx(
        'main.overlay',
        'main__overlay',
        {
          isLg,
          inlineStartSidebarOpen: navigationSidebarState,
          inlineEndSidebarOpen: complementarySidebarState,
        },
        classNames,
      )}
      data-state={navigationSidebarState === 'expanded' || complementarySidebarState === 'expanded' ? 'open' : 'closed'}
      aria-hidden='true'
      ref={forwardedRef}
    />
  );
});

export const Main = {
  Root: MainRoot,
  Content: MainContent,
  Overlay: MainOverlay,
  NavigationSidebar: MainNavigationSidebar,
  ComplementarySidebar: MainComplementarySidebar,
  Drawer: MainDrawerRoot,
};

export { useMainContext, useSidebars, useLandmarkMover };

export type {
  MainRootProps,
  MainContentProps,
  MainOverlayProps,
  MainNavigationSidebarProps,
  MainDrawerRootProps,
  SidebarState,
  DrawerState,
};
