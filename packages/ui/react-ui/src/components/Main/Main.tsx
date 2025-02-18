//
// Copyright 2023 DXOS.org
//

import { useFocusableGroup } from '@fluentui/react-tabster';
import { createContext } from '@radix-ui/react-context';
import { Root as DialogRoot, DialogContent } from '@radix-ui/react-dialog';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ComponentPropsWithRef,
  type Dispatch,
  forwardRef,
  type PropsWithChildren,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ComponentPropsWithoutRef,
} from 'react';

import { log } from '@dxos/log';
import { useMediaQuery, useForwardedRef } from '@dxos/react-hooks';

import { useSwipeToDismiss } from './useSwipeToDismiss';
import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

const MAIN_ROOT_NAME = 'MainRoot';
const NAVIGATION_SIDEBAR_NAME = 'NavigationSidebar';
const COMPLEMENTARY_SIDEBAR_NAME = 'ComplementarySidebar';
const MAIN_NAME = 'Main';
const GENERIC_CONSUMER_NAME = 'GenericConsumer';

type SidebarState = 'expanded' | 'collapsed' | 'closed';

type MainContextValue = {
  resizing: boolean;
  navigationSidebarState: SidebarState;
  setNavigationSidebarState: Dispatch<SetStateAction<SidebarState | undefined>>;
  complementarySidebarState: SidebarState;
  setComplementarySidebarState: Dispatch<SetStateAction<SidebarState | undefined>>;
};

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
  const focusableAttrs = useFocusableGroup({ tabBehavior: 'limited', ignoreDefaultKeydown: { Tab: true } });
  return { onKeyDown: handleKeyDown, [landmarkAttr]: landmark, tabIndex: 0, ...focusableAttrs };
};

const [MainProvider, useMainContext] = createContext<MainContextValue>(MAIN_NAME, {
  resizing: false,
  navigationSidebarState: 'closed',
  setNavigationSidebarState: (nextState) => {
    // TODO(burdon): Standardize with other context missing errors using raise.
    log.warn('Attempt to set sidebar state without initializing `MainRoot`');
  },
  complementarySidebarState: 'closed',
  setComplementarySidebarState: (nextState) => {
    // TODO(burdon): Standardize with other context missing errors using raise.
    log.warn('Attempt to set sidebar state without initializing `MainRoot`');
  },
});

const useSidebars = (consumerName = GENERIC_CONSUMER_NAME) => {
  const { setNavigationSidebarState, navigationSidebarState, setComplementarySidebarState, complementarySidebarState } =
    useMainContext(consumerName);
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

type MainRootProps = PropsWithChildren<{
  navigationSidebarState?: SidebarState;
  defaultNavigationSidebarState?: SidebarState;
  onNavigationSidebarStateChange?: (nextState: SidebarState) => void;
  complementarySidebarState?: SidebarState;
  defaultComplementarySidebarState?: SidebarState;
  onComplementarySidebarStateChange?: (nextState: SidebarState) => void;
}>;

const resizeDebounce = 3000;

const MainRoot = ({
  navigationSidebarState: propsNavigationSidebarState,
  defaultNavigationSidebarState,
  onNavigationSidebarStateChange,
  complementarySidebarState: propsComplementarySidebarState,
  defaultComplementarySidebarState,
  onComplementarySidebarStateChange,
  children,
  ...props
}: MainRootProps) => {
  const [isLg] = useMediaQuery('lg', { ssr: false });
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

type MainSidebarProps = ThemedClassName<ComponentPropsWithRef<typeof DialogContent>> & {
  swipeToDismiss?: boolean;
  state?: SidebarState;
  resizing?: boolean;
  onStateChange?: (nextState: SidebarState) => void;
  side: 'inline-start' | 'inline-end';
};

const MainSidebar = forwardRef<HTMLDivElement, MainSidebarProps>(
  (
    { classNames, children, swipeToDismiss, onOpenAutoFocus, state, resizing, onStateChange, side, ...props },
    forwardedRef,
  ) => {
    const [isLg] = useMediaQuery('lg', { ssr: false });
    const { tx } = useThemeContext();
    const ref = useForwardedRef(forwardedRef);
    const noopRef = useRef(null);
    useSwipeToDismiss(swipeToDismiss ? ref : noopRef, {
      onDismiss: () => onStateChange?.('closed'),
    });
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
          ((event.target as HTMLDivElement).closest('[data-tabster]') as HTMLDivElement)?.focus();
        }
        props.onKeyDown?.(event);
      },
      [props.onKeyDown],
    );
    const Root = isLg ? Primitive.div : DialogContent;
    return (
      <DialogRoot open={state !== 'closed'} modal={false}>
        <Root
          {...(!isLg && { forceMount: true, tabIndex: -1, onOpenAutoFocus: onOpenAutoFocus ?? handleOpenAutoFocus })}
          {...props}
          data-side={side === 'inline-end' ? 'ie' : 'is'}
          data-state={state}
          data-resizing={resizing ? 'true' : 'false'}
          className={tx('main.sidebar', 'main__sidebar', {}, classNames)}
          onKeyDown={handleKeyDown}
          {...(state === 'closed' && { inert: 'true' })}
          ref={ref}
        >
          {children}
        </Root>
      </DialogRoot>
    );
  },
);

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

MainNavigationSidebar.displayName = NAVIGATION_SIDEBAR_NAME;

type MainProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  asChild?: boolean;
  bounce?: boolean;
  handlesFocus?: boolean;
};

const MainContent = forwardRef<HTMLDivElement, MainProps>(
  ({ asChild, classNames, bounce, handlesFocus, children, role, ...props }: MainProps, forwardedRef) => {
    const { navigationSidebarState, complementarySidebarState } = useMainContext(MAIN_NAME);
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
        className={tx('main.content', 'main', { bounce, handlesFocus }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

MainContent.displayName = MAIN_NAME;

type MainOverlayProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof Primitive.div>, 'children'>>;

const MainOverlay = forwardRef<HTMLDivElement, MainOverlayProps>(({ classNames, ...props }, forwardedRef) => {
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const { navigationSidebarState, setNavigationSidebarState, complementarySidebarState, setComplementarySidebarState } =
    useMainContext(MAIN_NAME);
  const { tx } = useThemeContext();
  return (
    <div
      onClick={() => {
        setNavigationSidebarState('collapsed');
        setComplementarySidebarState('collapsed');
      }}
      {...props}
      className={tx(
        'main.overlay',
        'main__overlay',
        { isLg, inlineStartSidebarOpen: navigationSidebarState, inlineEndSidebarOpen: complementarySidebarState },
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
};

export { useMainContext, useSidebars };

export type { MainRootProps, MainProps, MainOverlayProps, MainNavigationSidebarProps, SidebarState };
